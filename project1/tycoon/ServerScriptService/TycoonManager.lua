--[[
	TycoonManager – server authority for the tycoon game
	Place in ServerScriptService as a Script
]]

local Players           = game:GetService("Players")
local RS                = game:GetService("ReplicatedStorage")
local RunService        = game:GetService("RunService")
local Debris            = game:GetService("Debris")

local Defs = require(RS:WaitForChild("ItemDefinitions"))

----------------------------------------------------------------
-- REMOTE EVENTS
----------------------------------------------------------------
local remoteFolder = Instance.new("Folder")
remoteFolder.Name   = "TycoonRemotes"
remoteFolder.Parent = RS

local function makeRemote(name)
	local r = Instance.new("RemoteEvent")
	r.Name   = name
	r.Parent = remoteFolder
	return r
end

local CashEvent    = makeRemote("UpdateCash")
local StatsEvent   = makeRemote("UpdateStats")
local NotifyEvent  = makeRemote("Notify")

----------------------------------------------------------------
-- STATE
----------------------------------------------------------------
local tycoonModels = workspace:WaitForChild("Tycoons"):GetChildren()
local pdata = {}  -- [userId] → player state table

----------------------------------------------------------------
-- HELPER: send full stat snapshot to a player
----------------------------------------------------------------
local function syncClient(player, d)
	CashEvent:FireClient(player, d.cash)
	StatsEvent:FireClient(player, {
		rebirthLevel = d.rebirthLevel,
		rebirthMult  = d.rebirthMult,
		purchased    = d.purchased,
		totalEarned  = d.totalEarned,
	})
end

----------------------------------------------------------------
-- HELPER: update the gate billboard text
----------------------------------------------------------------
local function setGateLabel(tycoon, text)
	local gate = tycoon:FindFirstChild("Gate")
	if gate then
		local bb = gate:FindFirstChildWhichIsA("BillboardGui")
		if bb then
			local lbl = bb:FindFirstChild("OwnerLabel")
			if lbl then lbl.Text = text end
		end
	end
	local sv = tycoon:FindFirstChild("OwnerLabelValue")
	if sv then sv.Value = text end
end

----------------------------------------------------------------
-- HELPER: does the player own this item?
----------------------------------------------------------------
local function owns(d, itemName)
	for _, n in ipairs(d.purchased) do
		if n == itemName then return true end
	end
	return false
end

----------------------------------------------------------------
-- BUILD A PURCHASED ITEM (physical part)
----------------------------------------------------------------
local function buildItem(tycoon, itemName)
	local def = Defs.GetItem(itemName)
	if not def or not def.buildOffset then return end

	local basePos = tycoon:FindFirstChild("Base").Position
	local folder  = tycoon:FindFirstChild("PurchasedItems")

	local p = Instance.new("Part")
	p.Name      = itemName
	p.Size      = def.buildSize or Vector3.new(6, 4, 6)
	p.Position  = basePos + def.buildOffset
	p.Anchored  = true
	p.Color     = def.buildColor or Color3.fromRGB(100, 100, 200)

	if def.category == "Droppers" then
		p.Material = Enum.Material.SmoothPlastic
		-- small chimney on top
		local chimney = Instance.new("Part")
		chimney.Name        = "Chimney"
		chimney.Size        = Vector3.new(2, 1.5, 2)
		chimney.Position    = p.Position + Vector3.new(0, (def.buildSize and def.buildSize.Y/2 or 2) + 0.75, 0)
		chimney.Anchored    = true
		chimney.Color       = def.oreColor or Color3.fromRGB(160, 160, 160)
		chimney.Material    = Enum.Material.Metal
		chimney.Parent      = folder

	elseif def.category == "Upgraders" then
		p.Material     = Enum.Material.Neon
		p.Transparency = 0.3
		p:SetAttribute("Multiplier", def.multiplier or 1)

		-- upgrader touch → multiply ore value once
		p.Touched:Connect(function(hit)
			if hit.Name ~= "Ore" then return end
			local tag = "Upg_" .. itemName
			if hit:GetAttribute(tag) then return end
			hit:SetAttribute(tag, true)

			local val = hit:GetAttribute("Value") or 1
			hit:SetAttribute("Value", val * (def.multiplier or 2))
			-- flash green briefly
			local old = hit.Color
			hit.Color = Color3.fromRGB(100, 255, 100)
			hit.Size  = hit.Size * 1.08
			task.delay(0.2, function()
				if hit and hit.Parent then hit.Color = old end
			end)
		end)

	elseif def.category == "Decorations" then
		p.Material = Enum.Material.Marble
	end

	-- floating name label
	local bb = Instance.new("BillboardGui")
	bb.Size        = UDim2.new(6, 0, 1, 0)
	bb.StudsOffset = Vector3.new(0, 3.5, 0)
	bb.Adornee     = p
	bb.Parent      = p

	local lbl = Instance.new("TextLabel")
	lbl.Size                 = UDim2.new(1, 0, 1, 0)
	lbl.BackgroundTransparency = 1
	lbl.Text                 = def.displayName
	lbl.TextColor3           = Color3.new(1, 1, 1)
	lbl.TextScaled           = true
	lbl.Font                 = Enum.Font.GothamBold
	lbl.Parent               = bb

	p.Parent = folder
end

----------------------------------------------------------------
-- HIDE / SHOW A PURCHASE PAD
----------------------------------------------------------------
local function hidePad(pad)
	pad.Transparency = 1
	pad.CanCollide   = false
	local bb = pad:FindFirstChildWhichIsA("BillboardGui")
	if bb then bb.Enabled = false end
end

local function showPad(pad)
	pad.Transparency = 0.15
	pad.CanCollide   = true
	local bb = pad:FindFirstChildWhichIsA("BillboardGui")
	if bb then bb.Enabled = true end
end

----------------------------------------------------------------
-- RESET A TYCOON (used on leave & rebirth)
----------------------------------------------------------------
local function resetTycoonVisuals(tycoon, keepPadsHidden)
	-- destroy built items
	local pf = tycoon:FindFirstChild("PurchasedItems")
	if pf then for _, c in ipairs(pf:GetChildren()) do c:Destroy() end end

	-- destroy ores
	local of = tycoon:FindFirstChild("Ores")
	if of then for _, c in ipairs(of:GetChildren()) do c:Destroy() end end

	-- reset base size
	local base = tycoon:FindFirstChild("Base")
	if base then base.Size = Vector3.new(72, 1, 72) end

	-- show/hide pads
	if not keepPadsHidden then
		local pads = tycoon:FindFirstChild("PurchasePads")
		if pads then
			for _, pad in ipairs(pads:GetChildren()) do showPad(pad) end
		end
	end
end

----------------------------------------------------------------
-- RELEASE TYCOON (player leaves)
----------------------------------------------------------------
local function releaseTycoon(player)
	for _, tycoon in ipairs(tycoonModels) do
		if tycoon:GetAttribute("Owner") == player.UserId then
			tycoon:SetAttribute("Owner", nil)
			setGateLabel(tycoon, "Unclaimed – Step on pad to claim!")
			resetTycoonVisuals(tycoon)

			-- un-hide claim pad
			local cp = tycoon:FindFirstChild("ClaimPad")
			if cp then showPad(cp) end
		end
	end
end

----------------------------------------------------------------
-- CLAIM PAD SETUP
----------------------------------------------------------------
local function setupClaimPads()
	for _, tycoon in ipairs(tycoonModels) do
		local cp = tycoon:FindFirstChild("ClaimPad")
		if not cp then continue end

		local debounce = false
		cp.Touched:Connect(function(hit)
			if debounce then return end
			local char   = hit.Parent
			local player = Players:GetPlayerFromCharacter(char)
			if not player then return end

			-- already owns one?
			if pdata[player.UserId] and pdata[player.UserId].tycoon then return end
			-- already taken?
			if tycoon:GetAttribute("Owner") ~= nil then return end

			debounce = true

			tycoon:SetAttribute("Owner", player.UserId)
			setGateLabel(tycoon, player.Name .. "'s Tycoon")
			hidePad(cp)

			-- hide BasicDropper pad (it's free & auto-given)
			local pads = tycoon:FindFirstChild("PurchasePads")
			if pads then
				local bdPad = pads:FindFirstChild("Pad_BasicDropper")
				if bdPad then hidePad(bdPad) end
			end

			local d = {
				cash          = 0,
				tycoon        = tycoon,
				purchased     = { "BasicDropper" },
				rebirthLevel  = 0,
				rebirthMult   = 1,
				totalEarned   = 0,
				conveyorSpeed = 12,
				hasAutoCollect = false,
				hasLucky       = false,
			}
			pdata[player.UserId] = d

			buildItem(tycoon, "BasicDropper")

			task.wait(0.3)
			syncClient(player, d)
			NotifyEvent:FireClient(player, "Welcome! Your Basic Dropper is running.")
			print("[Tycoon] " .. player.Name .. " claimed " .. tycoon.Name)

			task.wait(1)
			debounce = false
		end)
	end
end

----------------------------------------------------------------
-- PURCHASE PAD SETUP
----------------------------------------------------------------
local function setupPurchasePads()
	for _, tycoon in ipairs(tycoonModels) do
		local pads = tycoon:FindFirstChild("PurchasePads")
		if not pads then continue end

		for _, pad in ipairs(pads:GetChildren()) do
			local debounce = false
			pad.Touched:Connect(function(hit)
				if debounce then return end
				local char   = hit.Parent
				local player = Players:GetPlayerFromCharacter(char)
				if not player then return end

				local d = pdata[player.UserId]
				if not d or d.tycoon ~= tycoon then return end

				local itemName = pad:GetAttribute("ItemName")
				if not itemName then return end
				if owns(d, itemName) then return end

				local def = Defs.GetItem(itemName)
				if not def then return end

				if d.cash < def.cost then
					NotifyEvent:FireClient(player, "Need $" .. def.cost .. "!")
					return
				end

				debounce = true

				-- deduct & record
				d.cash = d.cash - def.cost
				table.insert(d.purchased, itemName)

				-- special effects
				if itemName == "AutoCollect" then
					d.hasAutoCollect = true
				elseif itemName == "FasterConveyor" then
					d.conveyorSpeed = def.conveyorSpeed or 24
				elseif itemName == "BiggerBase" then
					local base = tycoon:FindFirstChild("Base")
					if base then base.Size = Vector3.new(96, 1, 96) end
				elseif itemName == "LuckyClover" then
					d.hasLucky = true
				end

				buildItem(tycoon, itemName)
				hidePad(pad)

				syncClient(player, d)
				NotifyEvent:FireClient(player, "Purchased " .. def.displayName .. "!")
				print("[Tycoon] " .. player.Name .. " bought " .. def.displayName)

				task.wait(0.5)
				debounce = false
			end)
		end
	end
end

----------------------------------------------------------------
-- REBIRTH PAD SETUP
----------------------------------------------------------------
local function setupRebirthPads()
	for _, tycoon in ipairs(tycoonModels) do
		local rp = tycoon:FindFirstChild("RebirthPad")
		if not rp then continue end

		local debounce = false
		rp.Touched:Connect(function(hit)
			if debounce then return end
			local char   = hit.Parent
			local player = Players:GetPlayerFromCharacter(char)
			if not player then return end

			local d = pdata[player.UserId]
			if not d or d.tycoon ~= tycoon then return end

			local nextLvl = d.rebirthLevel + 1
			local info    = Defs.GetRebirthInfo(nextLvl)
			if not info then
				NotifyEvent:FireClient(player, "You've reached max rebirth!")
				return
			end
			if d.cash < info.cashRequired then
				NotifyEvent:FireClient(player, "Need $" .. info.cashRequired .. " to rebirth!")
				return
			end

			debounce = true

			-- reset state but keep rebirth progress
			d.cash          = 0
			d.rebirthLevel  = nextLvl
			d.rebirthMult   = info.mult
			d.purchased     = { "BasicDropper" }
			d.hasAutoCollect = false
			d.hasLucky       = false
			d.conveyorSpeed  = 12

			resetTycoonVisuals(tycoon)

			-- re-show all purchase pads except BasicDropper
			local pads = tycoon:FindFirstChild("PurchasePads")
			if pads then
				for _, pad in ipairs(pads:GetChildren()) do
					local n = pad:GetAttribute("ItemName")
					if n == "BasicDropper" then
						hidePad(pad)
					else
						showPad(pad)
					end
				end
			end

			buildItem(tycoon, "BasicDropper")

			-- update rebirth pad billboard
			local nextInfo = Defs.GetRebirthInfo(nextLvl + 1)
			local bb = rp:FindFirstChildWhichIsA("BillboardGui")
			if bb then
				local labels = bb:GetChildren()
				for _, lbl in ipairs(labels) do
					if lbl:IsA("TextLabel") and lbl.Position.Y.Scale > 0.4 then
						if nextInfo then
							lbl.Text = "$" .. tostring(nextInfo.cashRequired) .. " → " .. nextInfo.mult .. "x earnings"
						else
							lbl.Text = "MAX REBIRTH"
						end
					end
				end
			end

			syncClient(player, d)
			NotifyEvent:FireClient(player,
				"REBIRTH Lv" .. nextLvl .. "! Earnings now " .. info.mult .. "x!")

			task.wait(2)
			debounce = false
		end)
	end
end

----------------------------------------------------------------
-- COLLECTOR TOUCH → CASH
----------------------------------------------------------------
local function setupCollectors()
	for _, tycoon in ipairs(tycoonModels) do
		local coll = tycoon:FindFirstChild("Collector")
		if not coll then continue end

		coll.Touched:Connect(function(hit)
			if hit.Name ~= "Ore" then return end
			local ownerId = tycoon:GetAttribute("Owner")
			if not ownerId then hit:Destroy() return end

			local d = pdata[ownerId]
			if not d then hit:Destroy() return end

			local value  = (hit:GetAttribute("Value") or 1) * d.rebirthMult
			d.cash       = d.cash + value
			d.totalEarned = d.totalEarned + value

			local player = Players:GetPlayerByUserId(ownerId)
			if player then CashEvent:FireClient(player, d.cash) end

			hit:Destroy()
		end)
	end
end

----------------------------------------------------------------
-- ORE SPAWNING
----------------------------------------------------------------
local ORE_LIFETIME = 12

local function spawnOreForDropper(tycoon, d, def)
	local oresFolder = tycoon:FindFirstChild("Ores")
	if not oresFolder then return end
	-- cap active ores per tycoon to avoid lag
	if #oresFolder:GetChildren() > 60 then return end

	local basePos = tycoon:FindFirstChild("Base").Position

	local ore = Instance.new("Part")
	ore.Name     = "Ore"
	ore.Shape    = Enum.PartType.Ball
	ore.Size     = Vector3.new(2, 2, 2)
	ore.Color    = def.oreColor or Color3.fromRGB(160, 160, 160)
	ore.Material = Enum.Material.SmoothPlastic
	ore.Position = basePos + def.buildOffset + Vector3.new(0, 4, -3)
	ore.Anchored = false

	local val = def.earnings
	-- lucky clover: 10 % chance of double
	if d.hasLucky and math.random() < 0.10 then
		val = val * 2
		ore.Color = Color3.fromRGB(255, 255, 80) -- golden flash
		ore.Size  = Vector3.new(2.5, 2.5, 2.5)
	end
	ore:SetAttribute("Value", val)

	ore.Parent = oresFolder
	Debris:AddItem(ore, ORE_LIFETIME)
end

----------------------------------------------------------------
-- MAIN LOOP: dropping + conveyor push + auto-collect
----------------------------------------------------------------
local function mainLoop()
	local timers = {} -- [tycoonName][itemName] = lastTick

	while true do
		task.wait(0.4)
		local now = tick()

		for _, player in ipairs(Players:GetPlayers()) do
			local d = pdata[player.UserId]
			if not d or not d.tycoon then continue end

			local tName = d.tycoon.Name
			if not timers[tName] then timers[tName] = {} end

			-- spawn ores per dropper on their own interval
			for _, itemName in ipairs(d.purchased) do
				local def = Defs.GetItem(itemName)
				if not def or not def.earnings or def.earnings <= 0 then continue end

				local interval  = def.dropRate or 2
				local last      = timers[tName][itemName] or 0
				if now - last >= interval then
					timers[tName][itemName] = now
					spawnOreForDropper(d.tycoon, d, def)
				end
			end

			-- push ores toward collector & auto-collect
			local ores = d.tycoon:FindFirstChild("Ores")
			if ores then
				for _, ore in ipairs(ores:GetChildren()) do
					if ore:IsA("BasePart") and ore.Name == "Ore" then
						-- apply conveyor velocity
						local bv = ore:FindFirstChild("_cv")
						if not bv then
							bv = Instance.new("BodyVelocity")
							bv.Name     = "_cv"
							bv.MaxForce = Vector3.new(300, 0, 300)
							bv.Parent   = ore
						end
						bv.Velocity = Vector3.new(0, 0, -d.conveyorSpeed)

						-- auto-collect
						if d.hasAutoCollect then
							local val = (ore:GetAttribute("Value") or 1) * d.rebirthMult
							d.cash       = d.cash + val
							d.totalEarned = d.totalEarned + val
							ore:Destroy()
						end
					end
				end

				if d.hasAutoCollect then
					CashEvent:FireClient(player, d.cash)
				end
			end
		end
	end
end

----------------------------------------------------------------
-- PLAYER EVENTS
----------------------------------------------------------------
Players.PlayerAdded:Connect(function(player)
	task.wait(2)
	NotifyEvent:FireClient(player, "Welcome! Walk onto a yellow CLAIM pad to start.")
end)

Players.PlayerRemoving:Connect(function(player)
	releaseTycoon(player)
	pdata[player.UserId] = nil
end)

----------------------------------------------------------------
-- INIT
----------------------------------------------------------------
setupClaimPads()
setupPurchasePads()
setupRebirthPads()
setupCollectors()
task.spawn(mainLoop)

print("[TycoonManager] Ready – " .. #tycoonModels .. " plots available.")

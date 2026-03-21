--[[
	TycoonSetup – paste into the Roblox Studio Command Bar and press Enter.
	Creates 4 fully-equipped tycoon plots inside a "Tycoons" folder.
	Requires ItemDefinitions ModuleScript already in ReplicatedStorage.
]]

local RS   = game:GetService("ReplicatedStorage")
local Defs = require(RS:WaitForChild("ItemDefinitions"))

----------------------------------------------------------------
-- tiny builder helpers
----------------------------------------------------------------
local function part(props)
	local p = Instance.new("Part")
	p.Anchored        = true
	p.TopSurface      = Enum.SurfaceType.Smooth
	p.BottomSurface   = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do p[k] = v end
	return p
end

local function billboard(adornee, studsY, lines)
	-- lines = { {text, color, font, heightWeight}, ... }
	local bb = Instance.new("BillboardGui")
	bb.Size          = UDim2.new(7, 0, 2.5, 0)
	bb.StudsOffset   = Vector3.new(0, studsY, 0)
	bb.AlwaysOnTop   = false
	bb.Adornee       = adornee
	bb.Parent        = adornee

	local totalWeight = 0
	for _, l in ipairs(lines) do totalWeight = totalWeight + (l[4] or 1) end

	local yOff = 0
	for _, l in ipairs(lines) do
		local w = (l[4] or 1) / totalWeight
		local lbl = Instance.new("TextLabel")
		lbl.Name                 = l[1]
		lbl.Size                 = UDim2.new(1, 0, w, 0)
		lbl.Position             = UDim2.new(0, 0, yOff, 0)
		lbl.BackgroundTransparency = 1
		lbl.Text                 = l[1]
		lbl.TextColor3           = l[2]
		lbl.TextScaled           = true
		lbl.Font                 = l[3] or Enum.Font.GothamBold
		lbl.Parent               = bb
		yOff = yOff + w
	end
	return bb
end

----------------------------------------------------------------
-- CREATE PURCHASE PAD
----------------------------------------------------------------
local function makePurchasePad(parent, item, basePos)
	local pos = basePos + item.padOffset + Vector3.new(0, 0.25, 0)

	local pad = part({
		Name        = "Pad_" .. item.name,
		Size        = Vector3.new(6, 0.4, 4),
		Position    = pos,
		Color       = Color3.fromRGB(50, 220, 80),
		Material    = Enum.Material.Neon,
		Transparency = 0.15,
	})
	pad:SetAttribute("ItemName", item.name)
	pad:SetAttribute("Cost", item.cost)

	local costStr = item.cost == 0 and "FREE" or ("$" .. tostring(item.cost))
	billboard(pad, 3, {
		{ item.displayName,  Color3.new(1, 1, 1),           Enum.Font.GothamBold, 1 },
		{ costStr,           Color3.fromRGB(72, 255, 72),   Enum.Font.GothamBold, 1 },
		{ item.desc,         Color3.fromRGB(200, 200, 200), Enum.Font.Gotham,     0.8 },
	})

	pad.Parent = parent
	return pad
end

----------------------------------------------------------------
-- CREATE ONE TYCOON PLOT
----------------------------------------------------------------
local BASE_SIZE = 72

local function createPlot(index, origin)
	local model = Instance.new("Model")
	model.Name = "Tycoon" .. index

	-- ── base plate ──
	local base = part({
		Name     = "Base",
		Size     = Vector3.new(BASE_SIZE, 1, BASE_SIZE),
		Position = origin,
		Color    = Color3.fromRGB(90, 90, 95),
		Material = Enum.Material.Concrete,
	})
	base.Parent = model

	-- ── perimeter walls ──
	local hw = BASE_SIZE / 2
	local wh = 5
	local walls = {
		{ "WallN", Vector3.new(BASE_SIZE, wh, 1), Vector3.new(0, wh/2, -hw) },
		{ "WallS", Vector3.new(BASE_SIZE, wh, 1), Vector3.new(0, wh/2,  hw) },
		{ "WallE", Vector3.new(1, wh, BASE_SIZE), Vector3.new( hw, wh/2, 0) },
		{ "WallW", Vector3.new(1, wh, BASE_SIZE), Vector3.new(-hw, wh/2, 0) },
	}
	for _, w in ipairs(walls) do
		local wall = part({
			Name         = w[1],
			Size         = w[2],
			Position     = origin + w[3],
			Color        = Color3.fromRGB(130, 130, 135),
			Material     = Enum.Material.Concrete,
			Transparency = 0.55,
		})
		wall.Parent = model
	end

	-- ── entrance gate (south wall gap overlay) ──
	local gate = part({
		Name         = "Gate",
		Size         = Vector3.new(12, wh, 1),
		Position     = origin + Vector3.new(0, wh/2, hw),
		Color        = Color3.fromRGB(255, 220, 50),
		Material     = Enum.Material.Neon,
		Transparency = 0.55,
	})
	gate.Parent = model

	billboard(gate, 3, {
		{ "Unclaimed – Step on pad to claim!", Color3.fromRGB(255, 255, 120), Enum.Font.GothamBold, 1 },
	})
	-- The first TextLabel inside gate's BillboardGui acts as OwnerLabel
	gate:FindFirstChildWhichIsA("BillboardGui"):FindFirstChildWhichIsA("TextLabel").Name = "OwnerLabel"

	-- string value so server can also read it
	local ownerVal = Instance.new("StringValue")
	ownerVal.Name   = "OwnerLabelValue"
	ownerVal.Value  = "Unclaimed"
	ownerVal.Parent = model

	-- ── claim pad (just outside gate) ──
	local claimPad = part({
		Name         = "ClaimPad",
		Size         = Vector3.new(12, 0.4, 6),
		Position     = origin + Vector3.new(0, 0.25, hw + 4),
		Color        = Color3.fromRGB(255, 220, 50),
		Material     = Enum.Material.Neon,
		Transparency = 0.25,
	})
	claimPad.Parent = model

	billboard(claimPad, 2.5, {
		{ "STEP HERE TO CLAIM", Color3.fromRGB(255, 255, 100), Enum.Font.GothamBold, 1 },
	})

	-- ── conveyor belt (runs from +Z toward -Z, i.e. dropper area → collector) ──
	local conveyorLen = 40
	local conveyor = part({
		Name         = "Conveyor",
		Size         = Vector3.new(32, 0.5, 6),
		Position     = origin + Vector3.new(0, 0.75, 4),
		Color        = Color3.fromRGB(30, 30, 30),
		Material     = Enum.Material.DiamondPlate,
	})
	conveyor.Parent = model

	-- side rails
	for _, sx in ipairs({ -16.5, 16.5 }) do
		local rail = part({
			Name     = "Rail",
			Size     = Vector3.new(1, 1.2, 6),
			Position = origin + Vector3.new(sx, 1, 4),
			Color    = Color3.fromRGB(60, 60, 65),
			Material = Enum.Material.Metal,
		})
		rail.Parent = model
	end

	-- ── collector ──
	local collector = part({
		Name         = "Collector",
		Size         = Vector3.new(32, 3, 6),
		Position     = origin + Vector3.new(0, 2, -22),
		Color        = Color3.fromRGB(50, 220, 80),
		Material     = Enum.Material.Neon,
		Transparency = 0.25,
	})
	collector.Parent = model

	billboard(collector, 3, {
		{ "$ COLLECTOR $", Color3.fromRGB(72, 255, 72), Enum.Font.GothamBold, 1 },
	})

	-- ── dropper area marker (translucent floor highlight) ──
	local dropZone = part({
		Name         = "DropperArea",
		Size         = Vector3.new(32, 0.15, 14),
		Position     = origin + Vector3.new(0, 0.58, 24),
		Color        = Color3.fromRGB(80, 130, 200),
		Material     = Enum.Material.Neon,
		Transparency = 0.8,
	})
	dropZone.Parent = model

	-- ── rebirth pad (back of base) ──
	local rebirthPad = part({
		Name         = "RebirthPad",
		Size         = Vector3.new(8, 0.4, 5),
		Position     = origin + Vector3.new(0, 0.25, -30),
		Color        = Color3.fromRGB(200, 60, 255),
		Material     = Enum.Material.Neon,
		Transparency = 0.15,
	})
	rebirthPad.Parent = model

	local r1 = Defs.GetRebirthInfo(1)
	billboard(rebirthPad, 3, {
		{ "REBIRTH",        Color3.fromRGB(255, 120, 255), Enum.Font.GothamBold, 1 },
		{ "$" .. tostring(r1.cashRequired) .. " → " .. r1.mult .. "x earnings",
		  Color3.fromRGB(230, 180, 255), Enum.Font.Gotham, 0.8 },
	})

	-- ── spawn location ──
	local spawn = Instance.new("SpawnLocation")
	spawn.Name         = "TycoonSpawn"
	spawn.Size         = Vector3.new(6, 1, 6)
	spawn.Position     = origin + Vector3.new(0, 0.5, hw + 10)
	spawn.Anchored     = true
	spawn.Neutral      = false
	spawn.TeamColor    = BrickColor.new("White")
	spawn.Transparency = 1
	spawn.Parent       = model

	-- ── purchase pads ──
	local padsFolder = Instance.new("Folder")
	padsFolder.Name   = "PurchasePads"
	padsFolder.Parent = model

	for _, item in ipairs(Defs.Items) do
		makePurchasePad(padsFolder, item, origin)
	end

	-- ── runtime folders ──
	local f1 = Instance.new("Folder"); f1.Name = "PurchasedItems"; f1.Parent = model
	local f2 = Instance.new("Folder"); f2.Name = "Ores";          f2.Parent = model

	model.Parent = workspace:FindFirstChild("Tycoons")
	return model
end

----------------------------------------------------------------
-- BUILD ALL PLOTS
----------------------------------------------------------------
-- Remove old if re-running
local old = workspace:FindFirstChild("Tycoons")
if old then old:Destroy() end

local folder = Instance.new("Folder")
folder.Name   = "Tycoons"
folder.Parent = workspace

local gap = 100
local spots = {
	Vector3.new(-gap/2, 0.5, -gap/2),
	Vector3.new( gap/2, 0.5, -gap/2),
	Vector3.new(-gap/2, 0.5,  gap/2),
	Vector3.new( gap/2, 0.5,  gap/2),
}

for i, pos in ipairs(spots) do
	createPlot(i, pos)
end

print("[TycoonSetup] Built " .. #spots .. " tycoon plots with pads, conveyors & collectors!")

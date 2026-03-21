--[[
	TycoonGui – client HUD for the tycoon game
	Place in StarterGui as a LocalScript
]]

local Players  = game:GetService("Players")
local RS       = game:GetService("ReplicatedStorage")
local Tween    = game:GetService("TweenService")
local player   = Players.LocalPlayer

local remotes    = RS:WaitForChild("TycoonRemotes")
local CashEvent  = remotes:WaitForChild("UpdateCash")
local StatsEvent = remotes:WaitForChild("UpdateStats")
local NotifyEvt  = remotes:WaitForChild("Notify")

local Defs = require(RS:WaitForChild("ItemDefinitions"))

----------------------------------------------------------------
-- STATE
----------------------------------------------------------------
local cash         = 0
local rebirthLevel = 0
local rebirthMult  = 1
local purchased    = {}   -- set: purchased[name] = true
local totalEarned  = 0

----------------------------------------------------------------
-- ROOT GUI
----------------------------------------------------------------
local gui = Instance.new("ScreenGui")
gui.Name            = "TycoonHUD"
gui.ResetOnSpawn    = false
gui.ZIndexBehavior  = Enum.ZIndexBehavior.Sibling
gui.Parent          = player.PlayerGui

----------------------------------------------------------------
-- TINY BUILDERS
----------------------------------------------------------------
local function frame(props)
	local f = Instance.new("Frame")
	f.BorderSizePixel = 0
	for k, v in pairs(props) do f[k] = v end
	local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 10); c.Parent = f
	return f
end

local function label(props)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Font        = Enum.Font.GothamBold
	l.TextColor3  = Color3.new(1, 1, 1)
	l.TextScaled  = true
	for k, v in pairs(props) do l[k] = v end
	return l
end

local function btn(props)
	local b = Instance.new("TextButton")
	b.AutoButtonColor = true
	b.Font            = Enum.Font.Gotham
	b.TextColor3      = Color3.fromRGB(220, 220, 230)
	b.TextSize        = 12
	b.TextWrapped     = true
	b.BorderSizePixel = 0
	for k, v in pairs(props) do b[k] = v end
	local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 8); c.Parent = b
	return b
end

local function fmt(n)
	n = math.floor(n)
	if n >= 1e6  then return string.format("%.1fM", n / 1e6) end
	if n >= 1e3  then return string.format("%.1fK", n / 1e3) end
	return tostring(n)
end

----------------------------------------------------------------
-- TOP BAR  (cash + rebirth)
----------------------------------------------------------------
local topBar = frame({
	Name              = "TopBar",
	Size              = UDim2.new(0, 360, 0, 52),
	Position          = UDim2.new(0.5, -180, 0, 8),
	BackgroundColor3  = Color3.fromRGB(18, 18, 28),
	Parent            = gui,
})

-- gradient for polish
local grad = Instance.new("UIGradient")
grad.Color = ColorSequence.new(Color3.fromRGB(22, 22, 34), Color3.fromRGB(30, 30, 45))
grad.Parent = topBar

local cashIcon = label({
	Size       = UDim2.new(0, 36, 0, 36),
	Position   = UDim2.new(0, 10, 0.5, -18),
	Text       = "$",
	TextColor3 = Color3.fromRGB(72, 222, 72),
	Parent     = topBar,
})

local cashLbl = label({
	Name           = "CashLbl",
	Size           = UDim2.new(0, 150, 0, 36),
	Position       = UDim2.new(0, 48, 0.5, -18),
	Text           = "0",
	TextColor3     = Color3.fromRGB(72, 222, 72),
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent         = topBar,
})

local rbBadge = frame({
	Size             = UDim2.new(0, 120, 0, 30),
	Position         = UDim2.new(1, -130, 0.5, -15),
	BackgroundColor3 = Color3.fromRGB(110, 40, 160),
	Parent           = topBar,
})
local rbLbl = label({
	Size   = UDim2.new(1, 0, 1, 0),
	Text   = "Rebirth 0",
	TextColor3 = Color3.fromRGB(240, 200, 255),
	Parent = rbBadge,
})

local multLbl = label({
	Size       = UDim2.new(0, 100, 0, 18),
	Position   = UDim2.new(0.5, -50, 0, 62),
	Text       = "1x",
	TextColor3 = Color3.fromRGB(255, 210, 100),
	Font       = Enum.Font.Gotham,
	Parent     = gui,
})

----------------------------------------------------------------
-- SHOP PANEL  (right side, with category tabs)
----------------------------------------------------------------
local shopBg = frame({
	Name             = "Shop",
	Size             = UDim2.new(0, 230, 0, 440),
	Position         = UDim2.new(1, -240, 0.5, -220),
	BackgroundColor3 = Color3.fromRGB(18, 18, 28),
	Parent           = gui,
})

local shopTitle = label({
	Size       = UDim2.new(1, 0, 0, 32),
	Text       = "SHOP",
	TextColor3 = Color3.fromRGB(255, 210, 50),
	Parent     = shopBg,
})

-- tab bar
local tabBar = Instance.new("Frame")
tabBar.Name                = "Tabs"
tabBar.Size                = UDim2.new(1, -8, 0, 26)
tabBar.Position            = UDim2.new(0, 4, 0, 34)
tabBar.BackgroundTransparency = 1
tabBar.Parent              = shopBg

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding       = UDim.new(0, 3)
tabLayout.Parent        = tabBar

-- scrolling item list
local scroll = Instance.new("ScrollingFrame")
scroll.Name                  = "Items"
scroll.Size                  = UDim2.new(1, -8, 1, -70)
scroll.Position              = UDim2.new(0, 4, 0, 64)
scroll.BackgroundTransparency = 1
scroll.ScrollBarThickness    = 4
scroll.ScrollBarImageColor3  = Color3.fromRGB(80, 80, 100)
scroll.CanvasSize            = UDim2.new(0, 0, 0, 0)
scroll.Parent                = shopBg

local scrollList = Instance.new("UIListLayout")
scrollList.Padding   = UDim.new(0, 4)
scrollList.SortOrder = Enum.SortOrder.LayoutOrder
scrollList.Parent    = scroll

scrollList:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
	scroll.CanvasSize = UDim2.new(0, 0, 0, scrollList.AbsoluteContentSize.Y + 10)
end)

-- current category & tab buttons
local curCat = "Droppers"
local tabBtns = {}

local function refreshShop()
	-- clear
	for _, c in ipairs(scroll:GetChildren()) do
		if c:IsA("TextButton") then c:Destroy() end
	end

	local items = Defs.GetByCategory(curCat)
	for i, def in ipairs(items) do
		local owned   = purchased[def.name] ~= nil
		local afford  = cash >= def.cost

		local bgCol
		if owned then
			bgCol = Color3.fromRGB(28, 75, 28)
		elseif afford then
			bgCol = Color3.fromRGB(38, 38, 55)
		else
			bgCol = Color3.fromRGB(50, 28, 28)
		end

		local txt
		if owned then
			txt = def.displayName .. "\n✓  OWNED"
		else
			local costStr = def.cost == 0 and "FREE" or ("$" .. fmt(def.cost))
			txt = def.displayName .. "\n" .. costStr .. "  –  " .. def.desc
		end

		local b = btn({
			Name             = def.name,
			Size             = UDim2.new(1, 0, 0, 52),
			LayoutOrder      = i,
			BackgroundColor3 = bgCol,
			Text             = txt,
			TextSize         = 12,
			Parent           = scroll,
		})

		b.MouseButton1Click:Connect(function()
			-- purchases happen by stepping on pads; this just hints
			if owned then return end
			if not afford then
				-- could show a notification
			end
		end)
	end
end

for i, cat in ipairs(Defs.Categories) do
	local short = cat:sub(1, 5)
	local t = btn({
		Name             = "Tab_" .. cat,
		Size             = UDim2.new(0, 52, 1, 0),
		LayoutOrder      = i,
		BackgroundColor3 = (cat == curCat) and Color3.fromRGB(55, 55, 85) or Color3.fromRGB(30, 30, 45),
		Text             = short,
		TextSize         = 10,
		Font             = Enum.Font.GothamBold,
		Parent           = tabBar,
	})
	tabBtns[cat] = t

	t.MouseButton1Click:Connect(function()
		curCat = cat
		for c, tb in pairs(tabBtns) do
			tb.BackgroundColor3 = (c == cat)
				and Color3.fromRGB(55, 55, 85)
				or  Color3.fromRGB(30, 30, 45)
		end
		refreshShop()
	end)
end

refreshShop()

----------------------------------------------------------------
-- STATS PANEL  (bottom-left)
----------------------------------------------------------------
local statsBox = frame({
	Name             = "Stats",
	Size             = UDim2.new(0, 190, 0, 90),
	Position         = UDim2.new(0, 10, 1, -100),
	BackgroundColor3 = Color3.fromRGB(18, 18, 28),
	Parent           = gui,
})

local statsTitle = label({
	Size   = UDim2.new(1, 0, 0, 22),
	Text   = "STATS",
	TextColor3 = Color3.fromRGB(180, 180, 200),
	Parent = statsBox,
})

local totalLbl = label({
	Size           = UDim2.new(1, -8, 0, 18),
	Position       = UDim2.new(0, 4, 0, 24),
	Text           = "Total: $0",
	TextColor3     = Color3.fromRGB(140, 220, 140),
	Font           = Enum.Font.Gotham,
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent         = statsBox,
})

local itemsLbl = label({
	Size           = UDim2.new(1, -8, 0, 18),
	Position       = UDim2.new(0, 4, 0, 44),
	Text           = "Items: 0/" .. #Defs.Items,
	TextColor3     = Color3.fromRGB(140, 140, 220),
	Font           = Enum.Font.Gotham,
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent         = statsBox,
})

local rateLbl = label({
	Size           = UDim2.new(1, -8, 0, 18),
	Position       = UDim2.new(0, 4, 0, 64),
	Text           = "Rate: $0/s",
	TextColor3     = Color3.fromRGB(220, 220, 140),
	Font           = Enum.Font.Gotham,
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent         = statsBox,
})

----------------------------------------------------------------
-- NOTIFICATION BAR  (centre-top, fades)
----------------------------------------------------------------
local notifLbl = label({
	Size            = UDim2.new(0, 420, 0, 36),
	Position        = UDim2.new(0.5, -210, 0.14, 0),
	Text            = "",
	TextColor3      = Color3.fromRGB(255, 255, 120),
	TextTransparency = 1,
	Parent          = gui,
})

local function showNotif(msg)
	notifLbl.Text             = msg
	notifLbl.TextTransparency = 0
	task.delay(3.5, function()
		Tween:Create(notifLbl, TweenInfo.new(0.8), { TextTransparency = 1 }):Play()
	end)
end

----------------------------------------------------------------
-- CASH POPUP  (+$X floats up and fades)
----------------------------------------------------------------
local function cashPopup(amount)
	if amount <= 0 then return end
	local pop = label({
		Size            = UDim2.new(0, 120, 0, 28),
		Position        = UDim2.new(0.5, -60, 0, 36),
		Text            = "+$" .. fmt(amount),
		TextColor3      = Color3.fromRGB(100, 255, 100),
		TextTransparency = 0,
		Parent          = gui,
	})
	Tween:Create(pop, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position         = UDim2.new(0.5, -60, 0, -5),
		TextTransparency = 1,
	}):Play()
	task.delay(1.3, function() pop:Destroy() end)
end

----------------------------------------------------------------
-- EARN RATE CALCULATOR
----------------------------------------------------------------
local function calcRate()
	local r = 0
	for name in pairs(purchased) do
		local def = Defs.GetItem(name)
		if def and def.earnings and def.earnings > 0 then
			r = r + def.earnings / (def.dropRate or 2)
		end
	end
	-- upgraders multiply
	for name in pairs(purchased) do
		local def = Defs.GetItem(name)
		if def and def.multiplier then
			r = r * def.multiplier
		end
	end
	return r * rebirthMult
end

----------------------------------------------------------------
-- REFRESH ALL UI
----------------------------------------------------------------
local function refreshAll()
	cashLbl.Text  = fmt(cash)
	rbLbl.Text    = "Rebirth " .. rebirthLevel
	multLbl.Text  = rebirthMult .. "x"
	totalLbl.Text = "Total: $" .. fmt(totalEarned)

	local count = 0
	for _ in pairs(purchased) do count = count + 1 end
	itemsLbl.Text = "Items: " .. count .. "/" .. #Defs.Items
	rateLbl.Text  = "Rate: ~$" .. fmt(calcRate()) .. "/s"

	refreshShop()
end

----------------------------------------------------------------
-- EVENT HANDLERS
----------------------------------------------------------------
CashEvent.OnClientEvent:Connect(function(newCash)
	local diff = newCash - cash
	cash = newCash
	cashLbl.Text = "$" .. fmt(cash)
	if diff > 0 then cashPopup(diff) end
end)

StatsEvent.OnClientEvent:Connect(function(s)
	rebirthLevel = s.rebirthLevel or 0
	rebirthMult  = s.rebirthMult  or 1
	totalEarned  = s.totalEarned  or 0
	purchased    = {}
	if s.purchased then
		for _, n in ipairs(s.purchased) do purchased[n] = true end
	end
	refreshAll()
end)

NotifyEvt.OnClientEvent:Connect(function(msg)
	showNotif(msg)
end)

----------------------------------------------------------------
-- INITIAL DRAW
----------------------------------------------------------------
refreshAll()
print("[TycoonGui] HUD ready.")

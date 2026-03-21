--[[
	ItemDefinitions – shared catalogue for the tycoon game
	Place in ReplicatedStorage as a ModuleScript named "ItemDefinitions"
]]

local M = {}

----------------------------------------------------------------
-- CATEGORIES (tab order in the shop)
----------------------------------------------------------------
M.Categories = { "Droppers", "Upgraders", "Decorations", "Expansion" }

----------------------------------------------------------------
-- ITEM LIST
-- padOffset   = where the buy-pad sits relative to the base centre
-- buildOffset = where the built model sits relative to the base centre
-- earnings    = cash per ore  (droppers only)
-- multiplier  = ore value multiplier  (upgraders only)
----------------------------------------------------------------
M.Items = {
	---------- DROPPERS ----------
	{
		name        = "BasicDropper",
		displayName = "Basic Dropper",
		desc        = "Drops stone ore worth $1",
		category    = "Droppers",
		cost        = 0,
		earnings    = 1,
		dropRate    = 2.0,
		oreColor    = Color3.fromRGB(163, 163, 163),
		padOffset   = Vector3.new(-18, 0, 18),
		buildOffset = Vector3.new(-18, 3, 22),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(85, 130, 200),
	},
	{
		name        = "IronDropper",
		displayName = "Iron Dropper",
		desc        = "Drops iron ore worth $4",
		category    = "Droppers",
		cost        = 75,
		earnings    = 4,
		dropRate    = 2.0,
		oreColor    = Color3.fromRGB(120, 120, 130),
		padOffset   = Vector3.new(-8, 0, 18),
		buildOffset = Vector3.new(-8, 3, 22),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(70, 100, 160),
	},
	{
		name        = "GoldDropper",
		displayName = "Gold Dropper",
		desc        = "Drops gold ore worth $10",
		category    = "Droppers",
		cost        = 300,
		earnings    = 10,
		dropRate    = 2.5,
		oreColor    = Color3.fromRGB(240, 200, 50),
		padOffset   = Vector3.new(2, 0, 18),
		buildOffset = Vector3.new(2, 3, 22),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(240, 200, 50),
	},
	{
		name        = "DiamondDropper",
		displayName = "Diamond Dropper",
		desc        = "Drops diamond ore worth $25",
		category    = "Droppers",
		cost        = 1200,
		earnings    = 25,
		dropRate    = 3.0,
		oreColor    = Color3.fromRGB(80, 200, 240),
		padOffset   = Vector3.new(12, 0, 18),
		buildOffset = Vector3.new(12, 3, 22),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(80, 200, 240),
	},
	{
		name        = "RubyDropper",
		displayName = "Ruby Dropper",
		desc        = "Drops ruby ore worth $60",
		category    = "Droppers",
		cost        = 5000,
		earnings    = 60,
		dropRate    = 3.5,
		oreColor    = Color3.fromRGB(220, 40, 40),
		padOffset   = Vector3.new(22, 0, 18),
		buildOffset = Vector3.new(22, 3, 22),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(220, 40, 40),
	},
	{
		name        = "EmeraldDropper",
		displayName = "Emerald Dropper",
		desc        = "Drops emerald ore worth $150",
		category    = "Droppers",
		cost        = 20000,
		earnings    = 150,
		dropRate    = 4.0,
		oreColor    = Color3.fromRGB(30, 200, 60),
		padOffset   = Vector3.new(-18, 0, 12),
		buildOffset = Vector3.new(-18, 3, 28),
		buildSize   = Vector3.new(6, 4, 6),
		buildColor  = Color3.fromRGB(30, 200, 60),
	},

	---------- UPGRADERS ----------
	{
		name        = "Upgrader2x",
		displayName = "2x Upgrader",
		desc        = "Doubles ore value on contact",
		category    = "Upgraders",
		cost        = 150,
		multiplier  = 2,
		padOffset   = Vector3.new(-20, 0, 0),
		buildOffset = Vector3.new(-12, 1.5, 2),
		buildSize   = Vector3.new(8, 2, 6),
		buildColor  = Color3.fromRGB(100, 220, 60),
	},
	{
		name        = "Upgrader5x",
		displayName = "5x Upgrader",
		desc        = "Multiplies ore value by 5",
		category    = "Upgraders",
		cost        = 2500,
		multiplier  = 5,
		padOffset   = Vector3.new(-20, 0, -6),
		buildOffset = Vector3.new(0, 1.5, 2),
		buildSize   = Vector3.new(8, 2, 6),
		buildColor  = Color3.fromRGB(50, 180, 30),
	},
	{
		name        = "Upgrader10x",
		displayName = "10x Upgrader",
		desc        = "Multiplies ore value by 10",
		category    = "Upgraders",
		cost        = 15000,
		multiplier  = 10,
		padOffset   = Vector3.new(-20, 0, -12),
		buildOffset = Vector3.new(12, 1.5, 2),
		buildSize   = Vector3.new(8, 2, 6),
		buildColor  = Color3.fromRGB(20, 130, 10),
	},

	---------- DECORATIONS ----------
	{
		name        = "Flag",
		displayName = "Tycoon Flag",
		desc        = "Marks your territory",
		category    = "Decorations",
		cost        = 30,
		padOffset   = Vector3.new(20, 0, 0),
		buildOffset = Vector3.new(28, 5, 28),
		buildSize   = Vector3.new(1, 10, 5),
		buildColor  = Color3.fromRGB(220, 40, 40),
	},
	{
		name        = "Statue",
		displayName = "Gold Statue",
		desc        = "A gleaming golden statue",
		category    = "Decorations",
		cost        = 600,
		padOffset   = Vector3.new(20, 0, -6),
		buildOffset = Vector3.new(28, 4, -28),
		buildSize   = Vector3.new(4, 8, 4),
		buildColor  = Color3.fromRGB(240, 200, 50),
	},
	{
		name        = "Fountain",
		displayName = "Diamond Fountain",
		desc        = "A sparkling water feature",
		category    = "Decorations",
		cost        = 3000,
		padOffset   = Vector3.new(20, 0, -12),
		buildOffset = Vector3.new(-28, 3, -28),
		buildSize   = Vector3.new(8, 5, 8),
		buildColor  = Color3.fromRGB(80, 200, 240),
	},
	{
		name        = "Throne",
		displayName = "Royal Throne",
		desc        = "Sit upon your riches",
		category    = "Decorations",
		cost        = 10000,
		padOffset   = Vector3.new(20, 0, -18),
		buildOffset = Vector3.new(0, 3, -28),
		buildSize   = Vector3.new(4, 6, 4),
		buildColor  = Color3.fromRGB(160, 50, 200),
	},

	---------- EXPANSION ----------
	{
		name           = "BiggerBase",
		displayName    = "Bigger Base",
		desc           = "Expands your tycoon plot",
		category       = "Expansion",
		cost           = 750,
		padOffset      = Vector3.new(0, 0, -18),
	},
	{
		name           = "FasterConveyor",
		displayName    = "Faster Conveyor",
		desc           = "Doubles conveyor speed",
		category       = "Expansion",
		cost           = 400,
		conveyorSpeed  = 24,
		padOffset      = Vector3.new(8, 0, -18),
	},
	{
		name           = "AutoCollect",
		displayName    = "Auto Collector",
		desc           = "Instantly collects all ore",
		category       = "Expansion",
		cost           = 8000,
		padOffset      = Vector3.new(-8, 0, -18),
	},
	{
		name           = "LuckyClover",
		displayName    = "Lucky Clover",
		desc           = "10 % chance of double-value ore",
		category       = "Expansion",
		cost           = 4000,
		padOffset      = Vector3.new(16, 0, -18),
	},
}

----------------------------------------------------------------
-- REBIRTH TABLE
----------------------------------------------------------------
M.Rebirth = {
	{ level = 1, cashRequired = 10000,    mult = 2 },
	{ level = 2, cashRequired = 50000,    mult = 4 },
	{ level = 3, cashRequired = 250000,   mult = 8 },
	{ level = 4, cashRequired = 1000000,  mult = 16 },
	{ level = 5, cashRequired = 5000000,  mult = 32 },
	{ level = 6, cashRequired = 25000000, mult = 64 },
}

----------------------------------------------------------------
-- HELPERS
----------------------------------------------------------------
function M.GetItem(name)
	for _, item in ipairs(M.Items) do
		if item.name == name then return item end
	end
	return nil
end

function M.GetByCategory(cat)
	local out = {}
	for _, item in ipairs(M.Items) do
		if item.category == cat then table.insert(out, item) end
	end
	return out
end

function M.GetRebirthInfo(lvl)
	for _, r in ipairs(M.Rebirth) do
		if r.level == lvl then return r end
	end
	return nil
end

return M

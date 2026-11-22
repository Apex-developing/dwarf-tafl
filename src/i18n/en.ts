import type { TKey } from './uk';

export const en: Record<TKey, string> = {
  // Main menu
  'menu.subtitle': 'Tactical dungeon battle',
  'menu.local': 'Play on one device',
  'menu.vsAI': 'Play against the computer',
  'menu.difficulty': 'Computer difficulty',
  'menu.rules': 'Game rules',
  'menu.dice': 'Dice',
  'menu.dice.app': 'In the app',
  'menu.dice.physical': 'Physical',
  'menu.dice.app.hint': 'The app rolls the dice for you.',
  'menu.dice.physical.hint': 'Roll real dice and enter the result — the game handles the rest.',
  'menu.version': 'Version {v} • PWA Ready',
  'menu.language': 'Language',
  'diff.easy': 'Easy',
  'diff.medium': 'Medium',
  'diff.hard': 'Hard',

  // Game screen
  'game.menu': 'Menu',
  'game.rules': 'Rules',
  'game.loading': 'Preparing the dungeon...',

  'seat.waiting': "Opponent's turn — please wait",
  'seat.menu': 'Menu',
  'sheet.rules': '📖 Rules',
  'sheet.layoutSide': '⇅ Normal view (one side)',
  'sheet.layoutFacing': '⇅ Face-to-face play',
  'sheet.toMenu': '◀ Main menu',
  'sheet.close': 'Close',

  // Casualties
  'captured.clan.title': "King's Clan losses",
  'captured.clan.short': 'Clan',
  'captured.rebels.title': 'Rebel losses',
  'captured.rebels.short': 'Rebels',

  // Turn indicator
  'turn.clan': "King's Clan's turn",
  'turn.rebels': "Rebels' turn",
  'turn.round': 'Round {n}',
  'turn.roundShort': 'R{n}',
  'phase.computer': 'Computer is thinking…',
  'phase.startTurn': 'Roll the dice to start your turn',
  'phase.rolling': 'Dice are rolling...',
  'phase.chooseAction': 'Choose an action ({n} of 2)',
  'phase.chooseActor': 'Choose a piece to move',
  'phase.chooseDestination': 'Choose the destination cell',
  'phase.resolving': 'Checking captures...',
  'phase.gameOver': 'Game over',

  // Dice panel
  'source.die1': 'Die 1',
  'source.die2': 'Die 2',
  'source.king': 'King',
  'face.shield': 'Shield',
  'face.rune': 'Rune',
  'action.march': 'March (up to {n})',
  'action.shieldSingle': 'One warrior, up to 5',
  'action.shieldDouble': 'Two warriors, 1 each',
  'action.runeMove': 'Straight, no limit',
  'action.runeResurrect': 'Revive a warrior',
  'action.kingMarch': 'King move (up to {n})',
  'desc.march.clan': 'Move a guard 1–{n} cells in a straight line',
  'desc.march.rebels': 'Move a piece 1–{n} cells in a straight line',
  'desc.shieldSingle.clan': 'Break through with one guard for up to 5 hexes',
  'desc.shieldSingle.rebels': 'Break through with one warrior for up to 5 hexes',
  'desc.shieldDouble': 'Two different pieces take 1 step each',
  'desc.runeMove.clan': 'Unlimited guard move in a straight line over free hexes',
  'desc.runeMove.rebels': 'Unlimited piece move in a straight line over free hexes',
  'desc.runeResurrect': 'Return 1 fallen fighter to the start zone',
  'desc.kingMarch': 'King in a straight line for 1–{n} cells. Dice do not apply',
  'dice.selected': 'Chosen: **{title}** — {hint}',
  'dice.hintSecond': 'choose the second piece',
  'dice.hintPiece': 'choose a piece and a cell',
  'dice.cancel': '✕ Cancel action',
  'dice.nothing': 'No moves available.',
  'dice.endTurn': 'End turn',
  'dice.choose.clan2':
    'Choose any 2 actions of 3: the dice act on guards, the king moves with his own action.',
  'dice.choose.clan1':
    'Choose one more of the two remaining actions: the dice act on guards, the king moves with his own action.',
  'dice.choose.rebels2': 'Choose two actions — each die gives one action for different pieces.',
  'dice.choose.rebels1': 'Choose one more action — each die gives one action for different pieces.',
  'dice.roll': 'Roll the dice (2d6)',
  'dice.hint.clan': 'Clan: 2 actions of 3 — die 1, die 2 (for guards) or the king move',
  'dice.hint.rebels': 'Rebels: 2 actions — one from each die',
  'dice.label': 'Dice:',
  'dice.entry.title': 'Roll your real dice and pick what came up',
  'dice.entry.die': 'Die {n}',
  'dice.entry.confirm': 'Confirm',
  'dice.entry.pick': 'Pick both dice',
  'dice.entry.toApp': '🎲 Roll in the app',
  'dice.toPhysical': '✋ Enter physical dice',
  'dice.change': 'Change dice',
  'dice.step': 'Action {n} of {m}',
  'dice.deselect': 'Deselect piece',

  // Game over
  'over.clan': "Victory of the King's Clan!",
  'over.rebels': 'Victory of the Rebels!',
  'over.draw': 'Draw',
  'over.escape': 'The King reached one of the Exits and broke the siege!',
  'over.surrounded': 'The King is surrounded on 3 sides! The Rebels have seized power over the mountain!',
  'over.noMoves': 'One side cannot make a single move — a draw.',
  'over.note': 'The board above is unchanged — take a look at the final position.',
  'over.again': 'Play again',
  'over.menu': 'Main menu',
  'over.alt': 'Result',

  // Rules
  'rules.title': 'Game rules: Dwarf Tafl',
  'rules.close': 'Got it',
  'rules.s1.title': '1. Sides and Goals',
  'rules.s1.clan':
    "{c|King's Clan (light):} 1 King on the Throne + 5 Guards around him. __Goal:__ the King must reach any of the 3 corner Exits.",
  'rules.s1.rebels':
    '{r|Rebels (dark):} 9 warriors (3 squads of 3 fighters in the corners). __Goal:__ surround the King on 3 sides (the board edge and the Throne also count as a side of the surround).',
  'rules.s1.first': 'The Rebels always move first.',
  'rules.s2.title': '2. Turn and Dice (2d6)',
  'rules.s2.intro':
    'At the start of a turn the player rolls **both dice (2d6)**. A turn consists of **two actions**, each from a different "source".',
  'rules.s2.rebels':
    '{r|Rebels:} sources are die 1 and die 2; both actions are performed by warriors.',
  'rules.s2.clan':
    "{c|King's Clan:} sources are die 1, die 2 and the **King's action** (a straight move of 1–3 cells). You pick **any two of the three**. The dice act only on **Guards**; the King does not move with dice.",
  'rules.s2.dice': 'What the dice give:',
  'rules.s2.march':
    '**1, 2, 3 or 4 (March):** move 1 piece in a straight line over 1–N free cells.',
  'rules.s2.shield':
    '**5 (Shield):** 1 piece up to 5 hexes OR two different pieces 1 hex each.',
  'rules.s2.rune':
    '**6 (Rune):** 1 piece any distance in a straight line OR revive 1 lost warrior in the start zone (the King cannot be revived).',
  'rules.s2.onePerPiece':
    '**One action — one piece:** a piece cannot receive two actions in a turn — the second action is performed by another piece.',
  'rules.s2.cancel':
    'A chosen action can be cancelled and another one chosen, as long as no piece has moved yet.',
  'rules.s3.title': '3. Special Cells',
  'rules.s3.throne':
    '**Throne (centre) and Exits (3 corners):** ordinary warriors and guards cannot stop on them, but may freely pass through in transit.',
  'rules.s3.king': 'The King may freely stop both on the Throne and on the Exits.',
  'rules.s3.rocks':
    '**Rocks (3 impassable hexes):** one on the straight line from the Throne to each Exit, two steps before the gate. You cannot stop on a rock or pass through it, so the gates are approached from the sides. For surrounding the King, a rock counts as the board edge.',
  'rules.s4.title': '4. Capturing Pieces',
  'rules.s4.custodial':
    'An enemy warrior dies if you sandwich it with two of your pieces from two opposite sides along a straight axis (custodial capture).',
  'rules.s4.hostile':
    'The empty Throne and empty Exits count as a "hostile wall" for both sides (an enemy can be sandwiched between a piece and the Throne/Exit).',
  'rules.s4.self': 'A piece that moves in between two enemies on its own **does not die**.',
  'rules.s4.resurrect':
    'A revived warrior acts like a piece that has just moved: it can capture too, and a revived rebel can complete the surround of the King.',
  'rules.s4.king':
    'The King is not killed by ordinary sandwiching — only by a 3-sided surround, and only by a **Rebel move**: if the King walks in between three enemies himself, he does not lose until a rebel piece steps next to him and completes the surround.',
  'rules.s4.draw': 'If a player cannot make a single move with any piece — it is a **draw**.',
  'rules.s4.kingSides':
    '**The King loses when 3 of his 6 sides are hostile.** A side is hostile if it holds a Rebel warrior, the empty Throne, or the board edge / a rock. The Throne counts once, the edge and rocks together also count once, and at least one real Rebel must be among the three.',

  // Rules figures (captions)
  'fig.escape': 'Escape: the King reaches an Exit — the Clan wins.',
  'fig.sandwich': 'Sandwich: a warrior between two enemy pieces on one line is captured.',
  'fig.wall': 'Wall: the empty Throne (or an empty Exit) acts like an enemy piece.',
  'fig.king.title': 'How the King falls',
  'fig.king.legend': 'Red hexes are hostile sides. Three out of six — and the King is surrounded.',
  'fig.king.three': 'Three Rebels on any 3 of the 6 sides — they need not stand together.',
  'fig.king.throne': '2 Rebels + the empty Throne.',
  'fig.king.edge': '2 Rebels + the board edge.',
  'fig.king.rock': '2 Rebels + a rock (counts as the edge).',
  'fig.king.safe': 'Only 2 hostile sides: a Clan guard is not an enemy — the King is safe.',
};

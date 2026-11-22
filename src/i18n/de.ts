import type { TKey } from './uk';

export const de: Record<TKey, string> = {
  // Main menu
  'menu.subtitle': 'Taktische Kerkerschlacht',
  'menu.local': 'Spiel an einem Gerät',
  'menu.vsAI': 'Gegen den Computer spielen',
  'menu.difficulty': 'Schwierigkeit des Computers',
  'menu.rules': 'Spielregeln',
  'menu.dice': 'Würfel',
  'menu.dice.app': 'In der App',
  'menu.dice.physical': 'Echte Würfel',
  'menu.dice.app.hint': 'Die App würfelt für dich.',
  'menu.dice.physical.hint':
    'Würfle mit echten Würfeln und gib das Ergebnis ein — den Rest übernimmt das Spiel.',
  'menu.version': 'Version {v} • PWA Ready',
  'menu.language': 'Sprache',
  'diff.easy': 'Leicht',
  'diff.medium': 'Mittel',
  'diff.hard': 'Schwer',

  // Game screen
  'game.menu': 'Menü',
  'game.rules': 'Regeln',
  'game.loading': 'Der Kerker wird vorbereitet...',

  'seat.waiting': 'Der Gegner ist am Zug — bitte warten',
  'seat.menu': 'Menü',
  'sheet.rules': '📖 Regeln',
  'sheet.layoutSide': '⇅ Normale Ansicht (eine Seite)',
  'sheet.layoutFacing': '⇅ Spiel gegenüber',
  'sheet.toMenu': '◀ Hauptmenü',
  'sheet.close': 'Schließen',

  // Casualties
  'captured.clan.title': 'Verluste des Königsclans',
  'captured.clan.short': 'Clan',
  'captured.rebels.title': 'Verluste der Rebellen',
  'captured.rebels.short': 'Rebellen',

  // Turn indicator
  'turn.clan': 'Königsclan am Zug',
  'turn.rebels': 'Rebellen am Zug',
  'turn.round': 'Runde {n}',
  'turn.roundShort': 'R{n}',
  'phase.computer': 'Computer denkt nach…',
  'phase.startTurn': 'Würfle, um den Zug zu beginnen',
  'phase.rolling': 'Die Würfel rollen...',
  'phase.chooseAction': 'Wähle eine Aktion ({n} von 2)',
  'phase.chooseActor': 'Wähle eine Figur zum Ziehen',
  'phase.chooseDestination': 'Wähle das Zielfeld',
  'phase.resolving': 'Schlagen wird geprüft...',
  'phase.gameOver': 'Spiel beendet',

  // Dice panel
  'source.die1': 'Würfel 1',
  'source.die2': 'Würfel 2',
  'source.king': 'König',
  'face.shield': 'Schild',
  'face.rune': 'Rune',
  'action.march': 'Marsch (bis {n})',
  'action.shieldSingle': 'Ein Krieger bis 5 Felder',
  'action.shieldDouble': 'Zwei Krieger je 1 Feld',
  'action.runeMove': 'Gerade ohne Limit',
  'action.runeResurrect': 'Krieger wiederbeleben',
  'action.kingMarch': 'Königszug (bis {n})',
  'desc.march.clan': 'Ein Gardist zieht 1–{n} Felder in gerader Linie',
  'desc.march.rebels': 'Eine Figur zieht 1–{n} Felder in gerader Linie',
  'desc.shieldSingle.clan': 'Durchbruch eines Gardisten um bis zu 5 Felder',
  'desc.shieldSingle.rebels': 'Durchbruch eines Kriegers um bis zu 5 Felder',
  'desc.shieldDouble': 'Zwei verschiedene Figuren ziehen je 1 Feld',
  'desc.runeMove.clan': 'Unbegrenzter Zug eines Gardisten in gerader Linie über freie Felder',
  'desc.runeMove.rebels': 'Unbegrenzter Zug einer Figur in gerader Linie über freie Felder',
  'desc.runeResurrect': 'Bringe 1 gefallenen Kämpfer in die Startzone zurück',
  'desc.kingMarch': 'König in gerader Linie 1–{n} Felder. Würfel wirken nicht',
  'dice.selected': 'Gewählt: **{title}** — {hint}',
  'dice.hintSecond': 'wähle die zweite Figur',
  'dice.hintPiece': 'wähle Figur und Feld',
  'dice.cancel': '✕ Aktion abbrechen',
  'dice.nothing': 'Keine Züge möglich.',
  'dice.endTurn': 'Zug beenden',
  'dice.choose.clan2':
    'Wähle beliebige 2 von 3 Aktionen: Die Würfel wirken auf Gardisten, der König zieht mit einer eigenen Aktion.',
  'dice.choose.clan1':
    'Wähle eine weitere der zwei übrigen Aktionen: Die Würfel wirken auf Gardisten, der König zieht mit einer eigenen Aktion.',
  'dice.choose.rebels2':
    'Wähle zwei Aktionen — jeder Würfel gibt eine Aktion für verschiedene Figuren.',
  'dice.choose.rebels1':
    'Wähle noch eine Aktion — jeder Würfel gibt eine Aktion für verschiedene Figuren.',
  'dice.roll': 'Würfel werfen (2d6)',
  'dice.hint.clan': 'Clan: 2 von 3 Aktionen — Würfel 1, Würfel 2 (für Gardisten) oder Königszug',
  'dice.hint.rebels': 'Rebellen: 2 Aktionen — je eine pro Würfel',
  'dice.label': 'Würfel:',
  'dice.entry.title': 'Würfle mit echten Würfeln und wähle das Ergebnis',
  'dice.entry.die': 'Würfel {n}',
  'dice.entry.confirm': 'Bestätigen',
  'dice.entry.pick': 'Wähle beide Würfel',
  'dice.entry.toApp': '🎲 In der App würfeln',
  'dice.toPhysical': '✋ Echte Würfel eingeben',
  'dice.change': 'Würfel ändern',
  'dice.step': 'Aktion {n} von {m}',
  'dice.deselect': 'Figurenauswahl aufheben',

  // Game over
  'over.clan': 'Sieg des Königsclans!',
  'over.rebels': 'Sieg der Rebellen!',
  'over.draw': 'Unentschieden',
  'over.escape': 'Der König hat einen der Ausgänge erreicht und die Belagerung durchbrochen!',
  'over.surrounded':
    'Der König ist von 3 Seiten umzingelt! Die Rebellen haben die Macht über den Berg ergriffen!',
  'over.noMoves': 'Eine Seite kann keinen einzigen Zug mehr machen — Unentschieden.',
  'over.note': 'Das Feld oben bleibt unverändert — du kannst die Endstellung in Ruhe ansehen.',
  'over.again': 'Nochmal spielen',
  'over.menu': 'Hauptmenü',
  'over.alt': 'Ergebnis',

  // Rules
  'rules.title': 'Spielregeln: Dwarf Tafl',
  'rules.close': 'Verstanden',
  'rules.s1.title': '1. Seiten und Ziel',
  'rules.s1.clan':
    '{c|Königsclan (hell):} 1 König auf dem Thron + 5 Gardisten um ihn herum. __Ziel:__ Der König muss einen der 3 Ausgänge in den Ecken erreichen.',
  'rules.s1.rebels':
    '{r|Rebellen (dunkel):} 9 Krieger (3 Trupps zu je 3 Kämpfern in den Ecken). __Ziel:__ den König von 3 Seiten umzingeln (auch der Brettrand und der Thron zählen als Seite der Umzingelung).',
  'rules.s1.first': 'Die Rebellen machen immer den ersten Zug.',
  'rules.s2.title': '2. Zug und Würfel (2d6)',
  'rules.s2.intro':
    'Zu Beginn des Zuges wirft der Spieler **beide Würfel (2d6)**. Ein Zug besteht aus **zwei Aktionen**, jede aus einer anderen „Quelle“.',
  'rules.s2.rebels':
    '{r|Rebellen:} Quellen sind Würfel 1 und Würfel 2; beide Aktionen führen Krieger aus.',
  'rules.s2.clan':
    '{c|Königsclan:} Quellen sind Würfel 1, Würfel 2 und die **Aktion des Königs** (ein Zug in gerader Linie um 1–3 Felder). Man wählt **beliebige zwei der drei**. Die Würfel wirken nur auf **Gardisten**; der König zieht nicht mit Würfeln.',
  'rules.s2.dice': 'Was die Würfel bringen:',
  'rules.s2.march':
    '**1, 2, 3 oder 4 (Marsch):** Bewege 1 Figur in gerader Linie um 1–N freie Felder.',
  'rules.s2.shield':
    '**5 (Schild):** 1 Figur bis zu 5 Felder ODER zwei verschiedene Figuren je 1 Feld.',
  'rules.s2.rune':
    '**6 (Rune):** 1 Figur beliebig weit in gerader Linie ODER Wiederbelebung von 1 gefallenen Krieger in der Startzone (der König kann nicht wiederbelebt werden).',
  'rules.s2.onePerPiece':
    '**Eine Aktion — eine Figur:** Eine Figur kann pro Zug nicht zwei Aktionen erhalten — die zweite Aktion führt eine andere Figur aus.',
  'rules.s2.cancel':
    'Eine gewählte Aktion kann abgebrochen und durch eine andere ersetzt werden, solange noch keine Figur gezogen hat.',
  'rules.s3.title': '3. Besondere Felder',
  'rules.s3.throne':
    '**Thron (Mitte) und Ausgänge (3 Ecken):** Gewöhnliche Krieger und Gardisten dürfen dort nicht stehen bleiben, können aber frei hindurchziehen.',
  'rules.s3.king': 'Der König darf sowohl auf dem Thron als auch auf den Ausgängen stehen bleiben.',
  'rules.s3.rocks':
    '**Felsen (3 unpassierbare Felder):** je einer auf der Geraden vom Thron zu jedem Ausgang, zwei Schritte vor dem Tor. Auf einem Felsen kann man weder stehen bleiben noch hindurchziehen, daher nähert man sich den Toren von den Seiten. Für die Umzingelung des Königs zählt ein Felsen als Brettrand.',
  'rules.s4.title': '4. Figuren schlagen',
  'rules.s4.custodial':
    'Ein feindlicher Krieger stirbt, wenn du ihn mit zwei eigenen Figuren von zwei gegenüberliegenden Seiten auf einer geraden Achse einklemmst (Custodial Capture).',
  'rules.s4.hostile':
    'Der leere Thron und leere Ausgänge gelten für beide Seiten als „feindliche Wand“ (ein Gegner kann zwischen einer Figur und dem Thron/Ausgang eingeklemmt werden).',
  'rules.s4.self':
    'Eine Figur, die sich selbst zwischen zwei Feinde stellt, **stirbt nicht**.',
  'rules.s4.resurrect':
    'Ein wiederbelebter Krieger verhält sich wie eine Figur, die gerade gezogen hat: Auch er kann schlagen, und ein wiederbelebter Rebell kann die Umzingelung des Königs vollenden.',
  'rules.s4.king':
    'Der König stirbt nicht durch gewöhnliches Einklemmen — nur durch Umzingelung von 3 Seiten, und nur durch einen **Zug der Rebellen**: Wenn der König selbst zwischen drei Feinde zieht, verliert er nicht, bis eine Rebellenfigur neben ihn tritt und die Umzingelung vollendet.',
  'rules.s4.draw': 'Wenn ein Spieler mit keiner Figur einen Zug machen kann, ist es **unentschieden**.',
  'rules.s4.kingSides':
    '**Der König verliert, wenn 3 seiner 6 Seiten feindlich sind.** Feindlich ist eine Seite mit einem Rebellenkrieger, dem leeren Thron oder dem Brettrand / einem Felsen. Der Thron zählt einmal, Rand und Felsen zusammen ebenfalls nur einmal, und unter den dreien muss mindestens ein echter Rebell sein.',

  // Rules figures (captions)
  'fig.escape': 'Flucht: Der König erreicht einen Ausgang — der Clan gewinnt.',
  'fig.sandwich': 'Einklemmen: Ein Krieger zwischen zwei feindlichen Figuren auf einer Geraden wird geschlagen.',
  'fig.wall': 'Wand: Der leere Thron (oder ein leerer Ausgang) wirkt wie eine feindliche Figur.',
  'fig.king.title': 'Wie der König fällt',
  'fig.king.legend': 'Rote Felder sind feindliche Seiten. Drei von sechs — und der König ist umzingelt.',
  'fig.king.three': 'Drei Rebellen auf beliebigen 3 der 6 Seiten — sie müssen nicht nebeneinander stehen.',
  'fig.king.throne': '2 Rebellen + der leere Thron.',
  'fig.king.edge': '2 Rebellen + der Brettrand.',
  'fig.king.rock': '2 Rebellen + ein Felsen (zählt als Rand).',
  'fig.king.safe': 'Nur 2 feindliche Seiten: Ein Gardist des Clans ist kein Feind — der König ist sicher.',
};

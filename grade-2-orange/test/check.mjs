import { ok, done } from './_load.mjs';
import { checkText, checkAnswer, checkSaid } from '../src/core/check.js';

const s = (i, a) => checkText(i, a).status;
ok(s('Au revoir', ['Au revoir']) === 'correct', 'exact');
ok(s('  au  REVOIR ', ['Au revoir']) === 'correct', 'case and spaces');
ok(s('A bientot', ['À bientôt']) === 'nearly', 'missing accents is only nearly');
ok(s('à bientôt', ['À bientôt']) === 'correct', 'lower-case accent fine');
ok(s('Bon weekend', ['Bon week-end']) === 'wrong', 'the hyphen counts');
ok(s('Bonne week-end', ['Bon week-end']) === 'wrong', 'Bonne is not Bon');
ok(s('Merci beacoup', ['Merci beaucoup']) === 'wrong', 'beacoup is wrong');
ok(s('Désolée', ['Désolé', 'Désolée', 'Désolé(e)']) === 'correct' && s('désolé', ['Désolé', 'Désolée', 'Désolé(e)']) === 'correct', 'both Désolé and Désolée');
ok(s('Desolee', ['Désolé', 'Désolée']) === 'nearly', 'Désolée without accents: nearly');
ok(s('', 'Allô') === 'empty', 'empty input');
for (const t of ["S'il vous plaît", 'S’il vous plaît', 'Sil vous plaît', "S'il vous plait"]) ok(['correct', 'nearly'].includes(s(t, ["S'il vous plaît"])), `apostrophe-insensitive: ${t}`);
ok(s("S'il vous plait", ["S'il vous plaît"]) === 'nearly', 'plait without hat is nearly');
ok(s("S'il vou plaît", ["S'il vous plaît"]) === 'wrong', 'missing s is wrong');
// speech: what the recogniser heard
ok(checkSaid('au revoir', ['Au revoir']).status === 'correct', 'heard exactly');
ok(checkSaid('Au revoir | aurevoir | au revoirs', ['Au revoir']).status === 'correct', 'any alternative');
ok(checkSaid('merci beaucoup', ['Merci beaucoup']).status === 'correct' && checkSaid('merci beaucou', ['Merci beaucoup']).status === 'correct', 'close enough');
ok(checkSaid('bonjour', ['Bonne chance']).status === 'wrong', 'different word');
ok(checkSaid('désolé', ['Désolé', 'Désolée', 'Désolé(e)']).status === 'correct', 'désolé said');
ok(checkSaid('', ['Allô']).status === 'empty', 'heard nothing');
// checkAnswer by type
ok(checkAnswer({ type: 'type', accept: ['De rien'] }, 'de rien').status === 'correct', 'type question');
ok(checkAnswer({ type: 'pickspell', answer: 'Allô' }, 'Allo').status === 'wrong', 'pick wrong spelling');
ok(checkAnswer({ type: 'letter', answer: 'é' }, 'é').status === 'correct', 'missing letter');
ok(checkAnswer({ type: 'tiles', target: 'rien' }, ['r', 'i', 'e', 'n']).status === 'correct', 'tiles right');
ok(checkAnswer({ type: 'tiles', target: 'rien' }, ['r', 'e', 'i', 'n']).status === 'wrong', 'tiles wrong');
ok(checkAnswer({ type: 'sound', answer: 'good' }, 'bad').status === 'wrong', 'sound wrong');
done('check');

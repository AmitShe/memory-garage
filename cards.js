export const pageSize = 16;
export const vehicles = [
  ["plane", "מטוס"], ["crane", "מנוף"], ["car", "מכונית מרוץ"],
  ["tractor", "טרקטור"], ["rocket", "טיל"], ["train", "רכבת"],
  ["firetruck", "כבאית"], ["boat", "סירה"], ["helicopter", "מסוק"]
];

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

export function makeDeck(level, random = Math.random) {
  const order = level <= 2 ? vehicles : shuffle([...vehicles], random);
  const pairs = level + 1;
  const cards = [];
  for (let pair = 0; pair < pairs; pair++) {
    const [image, name] = order[pair % vehicles.length];
    const badge = pairs > vehicles.length ? Math.floor(pair / vehicles.length) + 1 : 0;
    const card = { pair, image, name, badge };
    cards.push(card, card);
  }
  return shuffle(cards, random);
}

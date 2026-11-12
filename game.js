import { makeDeck, pageSize } from "./cards.js";
import { makeSound } from "./sound.js?v=2";

const $ = id => document.getElementById(id);
const play = makeSound($("sound"), "memory-garage:muted");
const board = $("board");
const status = $("status");
const next = $("next");
const previous = $("previous");
const following = $("following");
const ready = $("ready");
const reset = $("reset-dialog");
const parade = $("parade");
const key = "memory-garage:level";
const badges = ["#ffda76", "#a9e7d6", "#e3c8fa", "#ffd0b1", "#bce5fb"];

let level = 1;
try {
  const saved = Number(localStorage.getItem(key));
  if (Number.isSafeInteger(saved) && saved >= 1) level = saved;
} catch {}
let deck;
let page;
let first;
let second;
let matched;
let locked;
let done;
let hideTimer;
let celebrationTimer;

function pages() { return Math.ceil(deck.length / pageSize); }

function updateProgress() {
  $("level").textContent = "שלב " + level;
  $("tally").textContent = matched.size + " מתוך " + deck.length / 2 + " זוגות";
  $("progress").max = deck.length / 2;
  $("progress").value = matched.size;
}

function vehicleArt(kind) {
  const art = document.createElement("span");
  art.className = "vehicle-art";
  art.dataset.vehicle = kind;
  const image = new Image();
  image.src = "assets/" + kind + ".webp";
  image.alt = "";
  image.draggable = false;
  art.append(image);
  if (kind === "crane") {
    const hook = document.createElement("span");
    hook.className = "crane-hook";
    hook.append(image.cloneNode());
    art.append(hook);
  }
  return art;
}

function showPage() {
  const start = page * pageSize;
  board.replaceChildren();
  deck.slice(start, start + pageSize).forEach((card, offset) => {
    const index = start + offset;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.index = index;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = card.badge || "";
    badge.style.setProperty("--badge", badges[(card.badge - 1) % badges.length] || badges[0]);
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.textContent = "✓";
    tick.setAttribute("aria-hidden", "true");
    button.append(vehicleArt(card.image), badge, tick);
    button.addEventListener("click", () => flip(index));
    board.append(button);
  });

  $("paging").hidden = pages() === 1;
  $("page-label").textContent = "עמוד " + (page + 1) + " מתוך " + pages();
  paint();
}

function paint() {
  for (const button of board.children) {
    const index = Number(button.dataset.index);
    const card = deck[index];
    const found = matched.has(card.pair);
    const visible = found || index === first || index === second;
    button.classList.toggle("face", visible);
    button.classList.toggle("matched", found);
    button.setAttribute("aria-disabled", String(found || visible || locked || done));
    const name = card.name + (card.badge ? ", תג " + card.badge : "");
    button.setAttribute("aria-label", visible ? name + (found ? ", נמצא זוג" : "") : "קלף " + (index + 1) + ", הפוך");
  }
  previous.disabled = following.disabled = locked || done;
}

function start() {
  clearTimeout(hideTimer);
  clearTimeout(celebrationTimer);
  if (ready.open) ready.close();
  parade.replaceChildren();
  deck = makeDeck(level);
  page = 0;
  first = second = null;
  matched = new Set();
  locked = done = false;
  const columns = deck.length === 4 ? 2 : deck.length <= 8 ? 3 : 4;
  board.dataset.columns = columns;
  board.style.setProperty("--columns", columns);
  status.textContent = deck.length > pageSize ? "חפשו זוגות גם בין העמודים" : "הפכו שני קלפים ומצאו זוג";
  updateProgress();
  showPage();
}

function celebrate() {
  if (ready.open || reset.open) return;
  const kinds = [...new Set(deck.map(card => card.image))];
  parade.dataset.count = kinds.length;
  parade.replaceChildren(...kinds.map((kind, index) => {
    const bay = document.createElement("div");
    bay.className = "parade-bay";
    const art = vehicleArt(kind);
    art.classList.add("moving");
    art.style.setProperty("--delay", (index % 3) * 75 + "ms");
    bay.append(art);
    return bay;
  }));
  $("ready-text").textContent = "בשלב הבא מחכים " + (deck.length + 2) + " קלפים.";
  ready.showModal();
}

function flip(index) {
  if (locked || done || index === first || matched.has(deck[index].pair)) return;
  if (first === null) {
    first = index;
    status.textContent = "איפה הקלף התאום?";
    play("flip");
    paint();
    return;
  }

  second = index;
  if (deck[first].pair === deck[second].pair) {
    const found = deck[first];
    matched.add(found.pair);
    first = second = null;
    play(found.image);
    updateProgress();
    status.textContent = "מצאתם זוג!";
    paint();
    for (const button of board.children) {
      if (deck[Number(button.dataset.index)].pair === found.pair) {
        button.querySelector(".vehicle-art").classList.add("moving");
      }
    }
    if (matched.size === deck.length / 2) {
      done = true;
      try { localStorage.setItem(key, String(level + 1)); } catch {}
      paint();
      celebrationTimer = setTimeout(celebrate, 650);
    }
  } else {
    locked = true;
    status.textContent = "זכרו איפה הם. נסו שוב!";
    play("miss");
    paint();
    hideTimer = setTimeout(() => {
      first = second = null;
      locked = false;
      paint();
    }, 820);
  }
}

function changePage(delta) {
  if (locked || done) return;
  page = (page + delta + pages()) % pages();
  showPage();
}

previous.addEventListener("click", () => changePage(-1));
following.addEventListener("click", () => changePage(1));
next.addEventListener("click", () => {
  level++;
  start();
  board.firstElementChild.focus();
});
ready.addEventListener("cancel", event => event.preventDefault());
for (const button of [$("restart"), $("restart-ready")]) {
  button.addEventListener("click", () => {
    reset.returnValue = "";
    reset.showModal();
  });
}
reset.addEventListener("close", () => {
  if (reset.returnValue !== "restart") {
    if (done) celebrate();
    return;
  }
  level = 1;
  try { localStorage.setItem(key, "1"); } catch {}
  start();
  board.firstElementChild.focus({ preventScroll: true });
});
start();

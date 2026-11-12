import { makeDeck, pageSize } from "./cards.js";
import { makeSound } from "./sound.js";

const $ = id => document.getElementById(id);
const play = makeSound($("sound"), "memory-garage:muted");
const board = $("board");
const status = $("status");
const next = $("next");
const previous = $("previous");
const following = $("following");
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

function pages() { return Math.ceil(deck.length / pageSize); }

function updateProgress() {
  $("level").textContent = "שלב " + level;
  $("tally").textContent = matched.size + " מתוך " + deck.length / 2 + " זוגות";
  $("progress").max = deck.length / 2;
  $("progress").value = matched.size;
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
    const image = new Image();
    image.src = "assets/" + card.image + ".webp";
    image.alt = "";
    image.draggable = false;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = card.badge || "";
    badge.style.setProperty("--badge", badges[(card.badge - 1) % badges.length] || badges[0]);
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.textContent = "✓";
    tick.setAttribute("aria-hidden", "true");
    button.append(image, badge, tick);
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
  deck = makeDeck(level);
  page = 0;
  first = second = null;
  matched = new Set();
  locked = done = false;
  const columns = deck.length === 4 ? 2 : deck.length <= 8 ? 3 : 4;
  board.dataset.columns = columns;
  board.style.setProperty("--columns", columns);
  $("ready").hidden = true;
  status.textContent = deck.length > pageSize ? "חפשו זוגות גם בין העמודים" : "הפכו שני קלפים ומצאו זוג";
  updateProgress();
  showPage();
}

function flip(index) {
  if (locked || done || index === first || matched.has(deck[index].pair)) return;
  if (first === null) {
    first = index;
    status.textContent = "איפה הקלף התאום?";
    play([440], .06);
    paint();
    return;
  }

  second = index;
  if (deck[first].pair === deck[second].pair) {
    matched.add(deck[first].pair);
    first = second = null;
    play([523, 659, 784], .062);
    updateProgress();
    status.textContent = "מצאתם זוג!";
    if (matched.size === deck.length / 2) {
      done = true;
      try { localStorage.setItem(key, String(level + 1)); } catch {}
      $("ready").hidden = false;
      $("ready-text").textContent = "בשלב הבא מחכים " + (deck.length + 2) + " קלפים.";
      next.focus();
    }
    paint();
  } else {
    locked = true;
    status.textContent = "זכרו איפה הם. נסו שוב!";
    play([369, 311], .075);
    paint();
    setTimeout(() => {
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
start();

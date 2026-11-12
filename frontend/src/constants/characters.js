import { COLORS } from './colors';

const base = import.meta.env.BASE_URL;
const still = (id) => `${base}assets/ducks/duck-${id}.jpg`; // full-frame original illustration (never cropped)
const head = (id) => `${base}assets/stickers/head-${id}.png`; // transparent head, used as a sticker

/**
 * EDIT ME — everything shown on the character cards lives here.
 * Fields set to null are simply hidden on the card.
 * Facts come from the What The Duck world bible; Chaotic and Sassy still need their details.
 */
export const WORLD = {
  title: 'Welcome to the What The Duck world',
  text: 'Six ducks with six different personalities. Sunny, Softie, Boss, Thinky and Chaotic share one house, each with their own room. Sassy lives next door. You don’t have to be like everyone else to belong.',
  slogan: 'Dis-cover your inner duck.',
};

export const CHARACTERS = {
  sunny: {
    name: 'Sunny', human: 'Sarra', tagline: 'The positive one', color: COLORS.yellow, src: still('sunny'), head: head('sunny'),
    age: 24, job: 'Social media content creator',
    personality: 'Positive, energetic, friendly, hopeful.',
    flaw: 'Pretends everything is fine, even when it isn’t.',
    role: 'Tries to make every situation fun, even when everyone else is panicking.',
    story: 'Sarra was an ordinary content creator with a camera, a ring light and a million ideas. When a mysterious glitch cut the connection to the real world, she became Sunny — the duck who keeps smiling for the whole house.',
    funny: 'Says “everything is fine!” in the same cheerful voice, whatever is happening.',
    lines: ['Everything is fine! Totally fine!', 'Let’s make it fun!', 'Smile, we’re live!'],
  },
  softie: {
    name: 'Softie', human: null, tagline: 'The sensitive one', color: COLORS.pink, src: still('softie'), head: head('softie'),
    age: 22, job: 'English teacher',
    personality: 'Gentle, caring, emotional, affectionate.',
    flaw: 'Struggles to say no and protect their boundaries.',
    role: 'Cares about everybody and sometimes forgets to care for themself.',
    story: 'Softie used to teach English and felt every student’s worries as their own. Trapped in the Metaverse with the others, Softie became the heart of the house — the one who checks on everyone, even at 3 a.m.',
    funny: 'Is most likely to say “sure, no problem” while quietly not having a problem-free day.',
    lines: ['Are you okay? Want a hug?', 'I saved you a snack.', 'Oh… sure, I can help.'],
  },
  boss: {
    name: 'Boss', human: null, tagline: 'The control freak', color: COLORS.blue, src: still('boss'), head: head('boss'),
    age: 29, job: 'Gym coach',
    personality: 'Ambitious, confident, organized, competitive.',
    flaw: 'Needs to be in control and hates looking weak.',
    role: 'Tries to manage the house like a company.',
    story: 'Boss coached people to be their strongest and never missed a rep. Now stuck in the Metaverse, Boss runs the house like a well-oiled company — with schedules, goals and a very firm voice.',
    funny: 'Would schedule a meeting about the next meeting.',
    lines: ['I have a plan. Follow me.', 'Meeting in five minutes.', 'Weak? Never.'],
  },
  thinky: {
    name: 'Thinky', human: null, tagline: 'The overthinker', color: '#B58CFF', src: still('thinky'), head: head('thinky'),
    age: 26, job: 'Software developer',
    personality: 'Intelligent, curious, analytical, observant.',
    flaw: 'Overanalyzes everything and struggles to act.',
    role: 'Tries to understand the system and discover how they can escape.',
    story: 'Thinky debugged code for a living and noticed things nobody else did. When the glitch hit, Thinky started studying the Metaverse itself, looking for the bug that could lead everyone home.',
    funny: 'Has a theory for everything, and a second theory for why the first one might be wrong.',
    lines: ['What if this is a glitch?', 'Let me think about it…', 'Overthinking: 100%.'],
  },
  chaotic: {
    name: 'Chaotic', human: null, tagline: 'The wild one', color: '#FF9A1F', src: still('chaotic'), head: head('chaotic'),
    age: null, job: null,
    personality: 'Chaotic.',
    flaw: null, role: null,
    story: 'Chaotic shares the house with Sunny, Softie, Boss and Thinky. Their full story is still being written — edit it in src/constants/characters.js.',
    funny: null,
    lines: ['WHAT THE DUCK?!', 'I pressed it. Oops.', 'Wheeeee!'],
  },
  sassy: {
    name: 'Sassy', human: null, tagline: 'The neighbor', color: '#F9484E', src: still('sassy'), head: head('sassy'),
    age: null, job: null,
    personality: 'Sassy.',
    flaw: null, role: null,
    story: 'Sassy doesn’t live in the shared house — Sassy lives next door, close enough to drop by and far enough to leave. Their full story is still being written — edit it in src/constants/characters.js.',
    funny: null,
    lines: ['Not my problem.', 'Next door is calmer.', 'Whatever. I’m cool.'],
  },
};
// Order of the sidebar duck switcher
export const CHARACTER_ORDER = ['sunny', 'softie', 'boss', 'thinky', 'chaotic', 'sassy'];

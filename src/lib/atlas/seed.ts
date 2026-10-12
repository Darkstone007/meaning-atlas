import type { Account } from "./types.ts";

const surveyed = "survey · 12 October 2026";

function account(partial: Pick<Account, "id" | "expression" | "languages" | "community" | "attribution"> & Partial<Account>): Account {
  return {
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
    source: surveyed,
    codingSource: "researcher",
    kind: "established",
    typeReviewed: true,
    displayConsent: true,
    consent: {
      classWritten: true,
      publicWritten: true,
      classRecording: false,
      publicRecording: false,
      informOnly: false,
    },
    languagePractice: "",
    origin: "",
    meaning: "",
    example: "",
    feeling: "",
    context: "",
    intention: "",
    rephrasing: "",
    change: "",
    identity: "",
    withheld: "",
    listenerPractice: "",
    tags: { emotion: [], context: [], intention: [] },
    media: [],
    relations: [],
    ...partial,
  };
}

/** Writing cleared for public display. Contact details are not stored. */
export const SEED: Account[] = [
  account({
    id: "survey:ndeye-massa",
    attribution: "Ndeye Astou Ndiaye",
    expression: "Massa",
    languages: "Wolof",
    community: "Wolof",
    languagePractice: "French, Wolof - used with some friends and family; English - used with friends",
    origin: "It comes from wolof",
    example:
      'This is used when someone is aching or hurt or something happens to them, it\'s a word of comfort. "I stub my toe" "Ow massa" "I failed my exam" "Aw, massa, it\'s going to be okay". But it cannot be used in very serious settings, like when someone looses a loved one, those would require heavier words than a simple "massa".',
    meaning:
      "I did not realize I used it so often until I came here where I had to find a world to translate it or explain the whole meaning and context to my friends. I love this word so much, among other wolof words, because it can communicate so much in such a simple manner. So, almost every time my friends are ranting about something, this would be the word of choice, that somehow is now part of their vocabulary. At least that is what I allow myself to believe.",
    rephrasing:
      'Most recently, I have found that the Arabic word "مِسْكِين" was the closest translation in use and context. But for the past two years (before I thought of the Arabic translation) my go to was to simply explain what it meant. A couple of minutes in that moment and I could allow myself to repeat it every day with them while trusting that they understand what I mean by it.',
    withheld:
      'I wouldn\'t use it with non close friends, and this is regardless of whether they understand it or not. "Massa" is an informal word in wolof itself and it wouldn\'t be said to, say, your professor. But as I said earlier, I rarely divide my use of the word based on who I\'m talking to, at least consciously, because I know that after some explaining, it is an easy comprehension.',
    listenerPractice:
      'I would ask what this means. And I honestly do it more often than not; English is not my first language (as for a lot of people in this university) so I always ask my friends "what does this mean" even for the most seemingly trivial things, because I\'d rather voice my thoughts and understand than shy away and stay confused. Which is probably also why I make it a point to explain what "Massa" means instead of purposefully changing my vocabulary.',
    tags: { emotion: ["care"], context: ["friends", "family", "informal"], intention: ["comfort"] },
  }),
  account({
    id: "survey:khadidjatou-massa",
    attribution: "Khadidjatou",
    expression: "Massa",
    languages: "Wolof",
    community: "Senegal",
    languagePractice:
      "I speak wolof, French and English. I use wolof with family and honestly any Senegalese in general. French is used with friends and classmates. English would be classmates, professors, and anyone who doesn't speak wolof/French because English is not really the first language I would go with",
    origin:
      "Massa is an expression I grew up hearing and using in Senegal. It is part of the way we express empathy, care, and solidarity with one another.",
    example:
      'I would use it in almost any situation where someone is hurt or going through something difficult. For example, if a child falls and slightly hurts themselves, I might say, "Massa," to comfort them. But I would also use the exact same word when speaking to a friend who has lost someone they love or is going through a particularly difficult time in their life. The situations are completely different, yet the expression still feels appropriate in both. It is something I would say to a close friend, a family member, or even someone I do not know very well who is experiencing pain.',
    meaning:
      'When I say Massa, I am telling someone that I see their pain, that I care about what they are experiencing, and that, in some way, I am sharing that moment with them. It is like saying, "I am here for you. I may not be able to take away what you are going through, but I acknowledge your pain, and you do not have to feel alone in it." What I find particularly beautiful about the expression is that it works even when there is nothing to say. Sometimes, when someone is grieving or experiencing something deeply painful, words are not enough. You cannot fix the situation, and you might not know what advice to give. But you can still offer your presence, your compassion, and your understanding. Massa allows me to do that without needing to explain everything I feel because I know that the person will simply know what I mean.',
    rephrasing:
      'I usually explain it by saying that it means something like "I\'m sorry". However, I always feel that something gets lost in translation. In English, "I\'m sorry" can sometimes sound like a polite response, something you say because you are expected to say it. Massa feels more personal to me. It carries a sense of emotional closeness, even when you cannot fully understand what another person is experiencing. When I have to explain it I have to break down a feeling into several sentences, when in my own language and cultural context, one word can communicate all of it. I can explain its meaning, but I am not sure I can ever fully translate how it feels.',
    withheld:
      "Yes, to some extent. When I am around Senegalese people, I use Massa naturally without thinking twice about it. But funny enough, I also use it with my NYUAD friends, even though many of them are not Senegalese. I have used it around them so often that they understand what it means now, and some of them even use it with me! And I always find that really sweet",
    listenerPractice:
      "I usually ask what it means, especially if I notice that the person uses it in a situation where a simple translation does not seem sufficient",
    tags: { emotion: ["care", "solidarity"], context: ["friends", "family", "acquaintance"], intention: ["comfort"] },
  }),
  account({
    id: "survey:lana-cist-racun",
    attribution: "Lana",
    expression: "Čist račun - duga ljubav",
    languages: "Montenegrin; Serbian; Bosnian",
    community: "The Balkans",
    languagePractice: "Montenegrin/Serbian/Bosnian, English, French, Arabic",
    origin: "The Balkans",
    example: "Somebody is giving back the debt even if they are close friends.",
    meaning:
      "It's often used to declare that somebody is rightful and that they respect the deal. If you continue to respect the deal the love will be long term since there will be no bad blood in between people.",
    rephrasing: "It is irreplacable in english language but the litteral translation is: clear debt- long love",
    withheld:
      "It does not it just part of my identity that I like to use when it's accurate. There is no other sentence like it and feels like home",
    listenerPractice: "I ask about it and try to replicate the saying in my language or at least learn english translation",
    consent: {
      classWritten: true,
      publicWritten: true,
      classRecording: true,
      publicRecording: true,
      informOnly: false,
    },
    tags: { emotion: ["affection"], context: ["friends", "debt"], intention: ["approval"] },
  }),
];

alter table atlas_entry add column if not exists language_practice text not null default '';
alter table atlas_entry add column if not exists origin text not null default '';
alter table atlas_entry add column if not exists identity text not null default '';
alter table atlas_entry add column if not exists listener_practice text not null default '';

update atlas_entry set
  language_practice = $q$French, Wolof — used with some friends and family; English — used with friends.$q$,
  origin = $q$It comes from Wolof.$q$,
  example = $q$This is used when someone is aching or hurt. "I stub my toe." "Ow massa." "I failed my exam." "Aw, massa, it's going to be okay." It cannot be used in very serious settings, like when someone loses a loved one. Those would require heavier words than a simple "massa".$q$,
  meaning = $q$I did not realize I used it so often until I came here where I had to find a way to translate it or explain the whole meaning and context to my friends. I love this word so much, among other Wolof words, because it can communicate so much in such a simple manner. So, almost every time my friends are ranting about something, this would be the word of choice, that somehow is now part of their vocabulary. At least that is what I allow myself to believe.$q$,
  rephrasing = $q$Most recently, I have found that the Arabic word "مِسْكِين" was the closest translation in use and context. Before that I simply explained what it meant, then kept saying it with them.$q$,
  withheld = $q$I wouldn't use it with people who are not close friends, whether they understand it or not. "Massa" is informal in Wolof and wouldn't be said to, say, a professor. I rarely divide my use of the word based on who I'm talking to, at least consciously, because after some explaining it is easy to understand.$q$,
  listener_practice = $q$I would ask what this means. I do it more often than not. English is not my first language, so I ask my friends "what does this mean" even for seemingly trivial things. I'd rather understand than stay confused. That is also why I explain what "Massa" means instead of changing my vocabulary.$q$
where id = 'acct-4f2a';

update atlas_entry set
  language_practice = $q$I speak Wolof, French and English. I use Wolof with family and any Senegalese person in general. French is used with friends and classmates. English would be classmates, professors, and anyone who doesn't speak Wolof or French.$q$,
  origin = $q$Massa is an expression I grew up hearing and using in Senegal. It is part of the way we express empathy, care, and solidarity with one another.$q$,
  example = $q$I would use it when someone is hurt or going through something difficult. If a child falls, I might say "Massa." I would also use it with a friend who has lost someone. The situations differ, and the expression still feels appropriate. I would say it to a close friend, a family member, or someone I do not know very well who is in pain.$q$,
  meaning = $q$When I say Massa, I am telling someone that I see their pain, that I care, and that they do not have to feel alone in it. It works even when there is nothing else to say. You cannot fix the situation, and you might not know what advice to give, but you can still offer your presence.$q$,
  rephrasing = $q$I usually say it means something like "I'm sorry." That can sound like a polite response. Massa feels more personal. It carries emotional closeness even when you cannot fully understand what the other person is experiencing. I can explain its meaning, but I am not sure I can translate how it feels.$q$,
  change_note = $q$In my own language one word can communicate all of it. In English I have to break a feeling into several sentences.$q$,
  withheld = $q$When I am around Senegalese people I use it without thinking. I also use it with friends who are not Senegalese. I have used it around them so often that they understand it, and some of them use it with me.$q$,
  listener_practice = $q$I usually ask what it means, especially if a simple translation does not seem sufficient.$q$
where id = 'acct-91c7';

update atlas_entry set
  language = 'Montenegrin',
  also_used = 'Serbian; Bosnian',
  language_practice = $q$Montenegrin, Serbian, Bosnian, English, French, Arabic.$q$,
  origin = $q$The Balkans.$q$,
  example = $q$Somebody is giving back a debt even if they are close friends.$q$,
  meaning = $q$It's often used to declare that somebody is rightful and that they respect the deal. If you continue to respect the deal the love will be long term, since there will be no bad blood between people.$q$,
  rephrasing = $q$It is irreplaceable in English. The literal translation is: clear debt — long love.$q$,
  identity = $q$It does not change how I speak so much as it is part of my identity that I like to use when it is accurate. There is no other sentence like it and it feels like home.$q$,
  listener_practice = $q$I ask about it and try to replicate the saying in my language, or at least learn an English translation.$q$
where id = 'acct-3b80';

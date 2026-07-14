import { gradeLevelBucket, slugify } from '@/lib/utils';
import { type ArticleSource, type GradeLevel, type ReadingQuestion } from '@/lib/types';

const TOPIC_LIBRARY: Record<string, ArticleSource[]> = {
  technology: [
    {
      title: 'AI Chips Are Changing the Pace of Research',
      source: 'Edubird.ai Wire',
      summary: 'Researchers are building faster, more efficient chips to train and run modern AI systems.',
      category: 'Tech',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Schools Test New Classroom Tools for Reading Support',
      source: 'Edubird.ai Wire',
      summary: 'Districts are piloting software that helps students practice comprehension with richer context.',
      category: 'Education',
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  science: [
    {
      title: 'Mars Rover Finds Evidence of Ancient Water Flow',
      source: 'Edubird.ai Wire',
      summary: 'Planetary scientists are studying rock layers that may reveal how long water persisted on Mars.',
      category: 'Science',
      imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  health: [
    {
      title: 'New Sleep Research Points to Better School Performance',
      source: 'Edubird.ai Wire',
      summary: 'A growing body of research links consistent sleep routines with stronger attention and recall.',
      category: 'Health',
      imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  environment: [
    {
      title: 'Cities Expand Shade Projects to Cool Summer Streets',
      source: 'Edubird.ai Wire',
      summary: 'Urban planners are using trees, lighter pavement, and reflective surfaces to reduce heat.',
      category: 'Environment',
      imageUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  space: [
    {
      title: 'Astronomers Track a Fast-Moving Comet Through the Solar System',
      source: 'Edubird.ai Wire',
      summary: 'Telescopes across the world are collaborating to follow a comet that may reveal ancient material.',
      category: 'Science',
      imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  ai: [
    {
      title: 'New Language Models Are Getting Better at Reasoning Tasks',
      source: 'Edubird.ai Wire',
      summary: 'Researchers are testing AI systems on multi-step logic problems to measure real progress beyond text generation.',
      category: 'AI',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  history: [
    {
      title: 'Archaeologists Uncover a Long-Buried Trade Route',
      source: 'Edubird.ai Wire',
      summary: 'Excavations reveal how ancient communities exchanged goods and ideas across long distances.',
      category: 'History',
      imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  politics: [
    {
      title: 'Lawmakers Debate a New Approach to Local Infrastructure Funding',
      source: 'Edubird.ai Wire',
      summary: 'Officials are weighing tradeoffs between short-term costs and long-term community benefits.',
      category: 'Politics',
      imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  sports: [
    {
      title: 'Underdog Team Prepares for a High-Stakes Championship Match',
      source: 'Edubird.ai Wire',
      summary: 'Coaches and analysts break down the strategy behind a surprising playoff run.',
      category: 'Sports',
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  nature: [
    {
      title: 'Researchers Track a Rare Species Returning to Its Habitat',
      source: 'Edubird.ai Wire',
      summary: 'Conservationists report encouraging signs after years of habitat restoration work.',
      category: 'Nature',
      imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  art: [
    {
      title: 'Museum Opens an Exhibit Blending Historic and Digital Art',
      source: 'Edubird.ai Wire',
      summary: 'Curators are pairing classic paintings with new interactive digital pieces for younger visitors.',
      category: 'Art',
      imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  'climate-change': [
    {
      title: 'Coastal Cities Test New Defenses Against Rising Waters',
      source: 'Edubird.ai Wire',
      summary: 'Engineers are piloting barriers and drainage systems designed to handle more frequent flooding.',
      category: 'Climate',
      imageUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  business: [
    {
      title: 'Small Manufacturers Adapt to Shifting Supply Chains',
      source: 'Edubird.ai Wire',
      summary: 'Companies are rethinking where they source materials after recent disruptions.',
      category: 'Business',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  entertainment: [
    {
      title: 'Streaming Platforms Compete Over Live Event Coverage',
      source: 'Edubird.ai Wire',
      summary: 'Studios are testing new formats to keep audiences engaged with real-time programming.',
      category: 'Entertainment',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  education: [
    {
      title: 'Districts Rethink How Reading Comprehension Is Taught',
      source: 'Edubird.ai Wire',
      summary: 'Teachers are combining current events with core reading skills to boost engagement.',
      category: 'Education',
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80'
    }
  ]
};

export function getFallbackArticles(topic: string): ArticleSource[] {
  const normalized = slugify(topic);
  const match =
    TOPIC_LIBRARY[normalized] ||
    TOPIC_LIBRARY[Object.keys(TOPIC_LIBRARY).find((key) => normalized.includes(key)) ?? 'technology'];

  return match.map((article, index) => ({
    ...article,
    link: `https://newslearn.local/articles/${slugify(article.title)}-${index}`,
    publishedAt: new Date(Date.now() - index * 86400000).toISOString()
  }));
}

/**
 * Extra elaboration paragraphs used to pad the fallback passage up to the
 * requested word count, without resorting to meta-referential phrasing like
 * "in the first section" / "the second section explores" (which reads like
 * the passage describing itself rather than actually being a passage).
 */
function extraFallbackParagraphs(cleanTopic: string, headline: string): string[] {
  return [
    `Stories like "${headline}" usually connect to bigger patterns than a single headline can capture. Reporters often leave out background details because they assume readers already know them, which is exactly the kind of gap a reading passage can fill in.`,
    `To really understand ${cleanTopic}, it helps to ask who is involved, what resources or decisions are at stake, and how long this issue has been developing. Most news topics have a history that stretches back further than the event that made headlines.`,
    `Experts who study ${cleanTopic} often disagree with each other, not because one side is wrong, but because they are weighing different priorities. Some care most about short-term effects, while others focus on what might happen years from now.`,
    `People outside of newsrooms experience ${cleanTopic} differently depending on where they live, what resources they have access to, and how directly the topic touches their daily lives. That is part of why the same story can be reported very differently by different outlets.`,
    `Reading closely about ${cleanTopic} means paying attention not just to what is stated directly, but to what a source implies, what evidence they use to back up a claim, and what questions are left unanswered.`
  ];
}

export function buildFallbackPassage(article: ArticleSource, gradeLevel: GradeLevel, targetWords: number) {
  const cleanTopic = (article.category || article.title || 'current events').trim();
  const headline = article.title?.trim() || cleanTopic;
  const title = `Understanding ${headline}`;
  const bucket = gradeLevelBucket(gradeLevel);
  const tone =
    bucket === 'elementary'
      ? 'simple and vivid'
      : bucket === 'middle'
        ? 'clear and explanatory'
        : bucket === 'university'
          ? 'analytical and precise'
          : 'balanced and academically focused';

  const articleSummary = article.summary?.trim();

  const paragraphs = [
    `A recent story, "${headline}"${article.source ? ` from ${article.source}` : ''}, gives a starting point for exploring ${cleanTopic}. ${
      articleSummary ? `Here is the core of it: ${articleSummary}` : ''
    } This passage builds on that starting point with a ${tone} explanation meant to help students understand not just what happened, but why it matters.`,
    `To understand ${cleanTopic} fully, it helps to know some background. This kind of topic usually develops over months or years before it becomes a headline, shaped by decisions made by institutions, communities, or individuals working on the issue long before most people were paying attention.`,
    `One idea worth understanding here is how ${cleanTopic} actually works in practice: what steps, people, or systems are involved, and what makes this particular development notable compared to what came before it.`,
    `This topic matters beyond the headline because it can affect how people live, learn, work, or make decisions. Understanding stories like this helps readers connect a single event to larger patterns happening in the world around them.`,
    `Looking ahead, there are open questions about how ${cleanTopic} will continue to develop, and reasonable people can disagree about what should happen next. That kind of uncertainty is part of what makes current events worth reading closely.`
  ];

  // Pad toward the target word count with additional context paragraphs
  // rather than producing a fixed-length passage regardless of the
  // requested length.
  const extras = extraFallbackParagraphs(cleanTopic, headline);
  let extraIndex = 0;
  while (
    paragraphs.join(' ').split(/\s+/).filter(Boolean).length < targetWords &&
    extraIndex < extras.length
  ) {
    paragraphs.splice(paragraphs.length - 1, 0, extras[extraIndex]);
    extraIndex += 1;
  }

  const text = paragraphs.join('\n\n');

  return {
    title,
    summary: articleSummary || `A learning passage about ${cleanTopic}.`,
    text,
    source: article.source || 'Edubird.ai Content Library'
  };
}

/**
 * Builds 3 distractor options for a "detail"-style question whose correct
 * answer is a real sentence pulled from the passage. Using other real
 * sentences from the same passage (instead of short canned phrases) keeps
 * every option in a similar length/detail range, so the correct answer can't
 * be picked out just by being the longest choice.
 */
function buildSentenceDistractors(correctSentence: string, allSentences: string[], usedAnswers: Set<string>): string[] {
  const candidates = allSentences.filter((sentence) => sentence !== correctSentence && !usedAnswers.has(sentence));
  const distractors = candidates.slice(0, 3);

  // If the passage doesn't have enough other sentences (very short passage),
  // pad with full-sentence-length generic fillers rather than short phrases.
  const filler = [
    'The passage does not mention this detail anywhere in the text.',
    'This statement contradicts what the passage actually describes.',
    'The passage presents this as the opposite of what really happened.'
  ];
  let fillerIndex = 0;
  while (distractors.length < 3 && fillerIndex < filler.length) {
    distractors.push(filler[fillerIndex]);
    fillerIndex += 1;
  }

  return distractors;
}

export function buildQuestions(title: string, topic: string, passage: string, count: number): ReadingQuestion[] {
  const sentences = passage.split(/(?<=[.!?])\s+/).filter(Boolean);
  const mainIdeaAnswer = `The passage explains how ${topic} connects to real-world learning and why the topic matters for students today.`;

  const questions: ReadingQuestion[] = [
    {
      type: 'main_idea',
      question: `What is the main idea of "${title}"?`,
      answer: mainIdeaAnswer,
      options: [
        mainIdeaAnswer,
        'The article focuses only on entertainment gossip and has no connection to real events.',
        'The article claims this topic has no relevance to students or their daily lives.',
        'The article is a fictional story written purely for entertainment, with no factual basis.'
      ]
    },
    {
      type: 'detail',
      question: `Which detail is most clearly supported by the passage?`,
      answer: sentences[0] ?? 'The passage gives a clear, real-world explanation of the topic for students to study.',
      options: [
        sentences[0] ?? 'The passage gives a clear, real-world explanation of the topic for students to study.',
        ...buildSentenceDistractors(sentences[0] ?? '', sentences.slice(1), new Set())
      ]
    },
    {
      type: 'vocabulary',
      question: `What does the word "context" most likely mean in this passage?`,
      answer: 'It means the surrounding background information that helps explain and clarify an idea.',
      options: [
        'It means the surrounding background information that helps explain and clarify an idea.',
        'It means a random, unrelated fact that has no connection to the main topic.',
        'It means a short headline used only to grab a reader\'s attention quickly.',
        'It means a specialized tool or instrument used in scientific laboratories.'
      ]
    },
    {
      type: 'inference',
      question: `What can the reader infer about the author's attitude?`,
      answer: 'The author values careful, close reading and sees this topic as genuinely important for learning.',
      options: [
        'The author values careful, close reading and sees this topic as genuinely important for learning.',
        'The author seems confused about the topic and does not make a clear point anywhere.',
        'The author actively wants readers to ignore all of the evidence presented here.',
        'The author believes this topic should be dismissed and is not worth anyone\'s attention.'
      ]
    },
    {
      type: 'purpose',
      question: `Why did the author write this passage?`,
      answer: 'To inform readers and support comprehension practice using a relevant, news-inspired topic.',
      options: [
        'To inform readers and support comprehension practice using a relevant, news-inspired topic.',
        'To persuade readers to purchase a specific product that is mentioned in the passage.',
        'To tell an entirely fictional adventure story unrelated to real current events.',
        'To provide a quick recap of unrelated sports scores from the past week.'
      ]
    }
  ];

  // The base set only covers 5 question types. If more questions were
  // requested, generate additional "detail" questions from other sentences
  // in the passage so the returned count always matches what was asked for,
  // instead of silently capping at 5.
  const usableSentences = sentences.length > 0 ? sentences : [`This passage discusses ${topic} in detail for students.`];
  const usedAnswers = new Set(questions.map((q) => q.answer));
  let sentenceCursor = 1;
  while (questions.length < count) {
    const sentence = usableSentences[sentenceCursor % usableSentences.length];
    sentenceCursor += 1;
    usedAnswers.add(sentence);
    questions.push({
      type: 'detail',
      question: `Which additional detail is supported by the passage?`,
      answer: sentence,
      options: [sentence, ...buildSentenceDistractors(sentence, usableSentences, usedAnswers)]
    });
  }

  return questions.slice(0, count).map((question, index) => ({
    ...question,
    explanation: `${topic} is used as a news-based learning context in question ${index + 1}.`
  }));
}

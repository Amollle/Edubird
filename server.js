const express = require('express');
const cors = require('cors');
const path = require('path');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 3001;
const parser = new Parser();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// RSS feed sources for news
const FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'
];

// GET /api/search?topic=TEXT - Fetch real news via RSS
app.get('/api/search', async (req, res) => {
  try {
    const topic = (req.query.topic || '').toLowerCase();
    let allItems = [];

    for (const feedUrl of FEEDS) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items.map(item => ({
          title: item.title || 'Untitled',
          link: item.link || '',
          content: item.contentSnippet || item.content || '',
          pubDate: item.pubDate || '',
          source: feed.title || 'News Source'
        }));
        allItems = allItems.concat(items);
      } catch (e) {
        // Skip failed feeds
      }
    }

    // Filter by topic if provided
    if (topic) {
      allItems = allItems.filter(item =>
        item.title.toLowerCase().includes(topic) ||
        item.content.toLowerCase().includes(topic)
      );
    }

    // Deduplicate by title
    const seen = new Set();
    allItems = allItems.filter(item => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Limit results
    allItems = allItems.slice(0, 20);

    res.json({ success: true, articles: allItems });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch news' });
  }
});

// POST /api/generate - Generate a passage + comprehension questions
app.post('/api/generate', (req, res) => {
  try {
    const { title, content, grade, questionCount, length } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Missing article content' });
    }

    const qCount = Math.min(Math.max(parseInt(questionCount) || 5, 1), 20);
    const passageLength = length || 'medium';

    // Clean content - remove HTML tags and truncate
    let cleanContent = content.replace(/<[^>]*>/g, '');
    
    // Extract passage based on length
    const words = cleanContent.split(/\s+/).filter(w => w.length > 0);
    let targetWords;
    switch (passageLength) {
      case 'short': targetWords = 200; break;
      case 'long': targetWords = 1000; break;
      default: targetWords = 500;
    }
    
    const passageWords = words.slice(0, targetWords);
    const passage = passageWords.join(' ');

    // Generate comprehension questions algorithmically
    const questions = generateQuestions(passage, title, qCount, grade);

    res.json({
      success: true,
      passage: {
        title: title,
        text: passage,
        source: req.body.source || 'News Article',
        wordCount: passageWords.length
      },
      questions: questions
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate passage' });
  }
});

function generateQuestions(passage, title, count, grade) {
  const questions = [];
  const sentences = passage.match(/[^.!?]+[.!?]+/g) || [passage];
  const words = passage.split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))].filter(w => w.length > 3);

  // Question types
  const types = ['main_idea', 'detail', 'vocabulary', 'inference', 'purpose'];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let question = { type, question: '', answer: '', options: [] };

    switch (type) {
      case 'main_idea': {
        question.question = `What is the main idea of this article titled "${title}"?`;
        question.answer = `The article discusses ${title.toLowerCase().includes('how') || title.toLowerCase().includes('why') ? '' : 'key developments in '}${title}. ${sentences[0] ? sentences[0].trim() : ''}`;
        // Generate distractors
        const distractors = generateDistractors(title, sentences);
        question.options = [question.answer, ...distractors].sort(() => Math.random() - 0.5);
        break;
      }
      case 'detail': {
        const detailSentence = sentences.length > 2 ? sentences[Math.floor(Math.random() * Math.min(sentences.length, 5))] : (sentences[0] || '');
        if (detailSentence) {
          const detailWords = detailSentence.split(/\s+/).filter(w => w.length > 3);
          if (detailWords.length > 2) {
            const keyWord = detailWords[Math.floor(detailWords.length / 2)].replace(/[^a-zA-Z]/g, '');
            question.question = `According to the article, what is mentioned about "${keyWord}"?`;
            question.answer = detailSentence.trim();
            question.options = [question.answer, 
              `The article does not mention "${keyWord}" at all.`,
              `"${keyWord}" is the main topic of a different article.`,
              `"${keyWord}" is mentioned briefly but not discussed in detail.`
            ].sort(() => Math.random() - 0.5);
          }
        }
        break;
      }
      case 'vocabulary': {
        if (uniqueWords.length > 5) {
          const vocabWord = uniqueWords[Math.floor(Math.random() * Math.min(uniqueWords.length, 30))];
          const contextSentence = sentences.find(s => s.toLowerCase().includes(vocabWord)) || '';
          question.question = `Based on the context of the article, what does the word "${vocabWord}" most likely mean?`;
          // Use the word in context for the answer
          if (contextSentence) {
            question.answer = `In this context, "${vocabWord}" relates to the article's discussion about ${title}. The sentence "${contextSentence.trim().substring(0, 100)}..." provides context for understanding this term.`;
          } else {
            question.answer = `"${vocabWord}" is used in the context of discussing ${title} and relates to the main themes of the article.`;
          }
          question.options = [question.answer,
            `"${vocabWord}" means the opposite of what is discussed in the article.`,
            `"${vocabWord}" is a technical term unrelated to the article's topic.`,
            `The meaning of "${vocabWord}" cannot be determined from the article.`
          ].sort(() => Math.random() - 0.5);
        }
        break;
      }
      case 'inference': {
        const inferSentence = sentences.length > 3 ? sentences[Math.floor(Math.random() * Math.min(sentences.length, 5))] : (sentences[0] || '');
        if (inferSentence) {
          const inferWords = inferSentence.split(/\s+/).filter(w => w.length > 4);
          if (inferWords.length > 1) {
            const inferWord = inferWords[Math.floor(Math.random() * Math.min(inferWords.length, 5))].replace(/[^a-zA-Z]/g, '');
            question.question = `Based on the article, what can be inferred about "${inferWord}"?`;
            question.answer = `From the article, we can infer that "${inferWord}" plays a significant role in the context of ${title}. The article suggests this through its discussion of related developments and implications.`;
            question.options = [question.answer,
              `"${inferWord}" is the least important aspect of the article.`,
              `The article explicitly states that "${inferWord}" is irrelevant.`,
              `No inference can be made about "${inferWord}" from the article.`
            ].sort(() => Math.random() - 0.5);
          }
        }
        break;
      }
      case 'purpose': {
        question.question = `What is the author's primary purpose in writing this article about "${title}"?`;
        question.answer = `The author's primary purpose is to inform readers about recent developments and key information regarding ${title}, providing context and analysis of the topic.`;
        question.options = [question.answer,
          `The author's purpose is to entertain readers with stories about ${title}.`,
          `The author is trying to persuade readers to take action regarding ${title}.`,
          `The author's purpose is to criticize opposing viewpoints about ${title}.`
        ].sort(() => Math.random() - 0.5);
        break;
      }
    }

    if (question.question && question.answer) {
      questions.push(question);
    }
  }

  return questions.slice(0, count);
}

function generateDistractors(title, sentences) {
  const distractors = [
    `The article focuses on entertainment news unrelated to "${title}".`,
    `The article argues against the importance of "${title}" in today's world.`,
    `The article is primarily about a different topic that only briefly mentions "${title}".`
  ];
  return distractors;
}

// Fallback: generate a passage from scratch for common topics
function generateFallbackPassage(topic, length) {
  const templates = {
    'technology': {
      title: 'Breakthroughs in Modern Technology',
      content: `In recent years, technology has continued to advance at an unprecedented pace, transforming nearly every aspect of our daily lives. From artificial intelligence and machine learning to quantum computing and biotechnology, researchers and engineers around the world are pushing the boundaries of what is possible.

One of the most significant developments has been in the field of artificial intelligence. AI systems are now capable of performing tasks that were once thought to require human intelligence, including natural language processing, image recognition, and strategic decision-making. These advances have led to applications in healthcare, where AI helps diagnose diseases; in transportation, where self-driving cars are becoming a reality; and in education, where personalized learning platforms adapt to individual student needs.

Another area of rapid progress is renewable energy technology. Solar panels have become more efficient and affordable, wind turbines are being deployed at larger scales, and new battery technologies are making energy storage more practical. These developments are crucial for addressing climate change and reducing our dependence on fossil fuels.

The rise of the Internet of Things (IoT) has connected devices in ways that were unimaginable just a decade ago. Smart homes, wearable devices, and industrial sensors are generating vast amounts of data that can be used to improve efficiency, safety, and quality of life.

As technology continues to evolve, it brings both opportunities and challenges. Issues such as data privacy, cybersecurity, and the ethical implications of AI require careful consideration. Nevertheless, the trajectory of technological progress shows no signs of slowing down, promising a future that is both exciting and full of potential.`
    },
    'science': {
      title: 'New Frontiers in Scientific Discovery',
      content: `Science continues to expand our understanding of the universe and ourselves. From the depths of the oceans to the far reaches of space, researchers are making discoveries that challenge our fundamental understanding of reality.

In the field of astronomy, new telescopes and observation techniques have revealed exoplanets orbiting distant stars, providing insights into the formation of planetary systems and the potential for life beyond Earth. The James Webb Space Telescope has captured images of galaxies formed shortly after the Big Bang, offering a window into the early universe.

Climate science has become increasingly important as the effects of global warming become more apparent. Scientists are studying ice cores, tree rings, and ocean sediments to understand past climate patterns and predict future changes. This research is essential for developing strategies to mitigate the impacts of climate change.

In medicine, breakthroughs in genomics and personalized medicine are revolutionizing how we treat diseases. CRISPR gene-editing technology has opened up new possibilities for correcting genetic disorders, while advances in immunotherapy are providing new weapons against cancer.

Neuroscience has made significant strides in understanding the brain's complexity. New imaging techniques allow researchers to observe brain activity in real-time, shedding light on consciousness, memory, and neurological disorders.

The pace of scientific discovery continues to accelerate, driven by collaboration across disciplines and advances in computing power. Each new finding raises new questions, ensuring that the journey of discovery is an endless one.`
    },
    'environment': {
      title: 'Environmental Challenges and Solutions',
      content: `The natural world faces unprecedented challenges from human activity, but innovative solutions are emerging to address these threats. Climate change, biodiversity loss, and pollution are among the most pressing environmental issues of our time.

Climate change, driven primarily by greenhouse gas emissions from burning fossil fuels, is causing global temperatures to rise, sea levels to increase, and extreme weather events to become more frequent and severe. Scientists warn that urgent action is needed to prevent the worst impacts of climate change.

Biodiversity loss is occurring at an alarming rate, with species extinction rates estimated to be hundreds of times higher than the natural background rate. Habitat destruction, overexploitation, pollution, and invasive species are the main drivers of this loss. Protecting and restoring ecosystems is crucial for maintaining the services that nature provides, including clean air and water, pollination, and climate regulation.

Plastic pollution has become a visible symbol of our disposable culture. Millions of tons of plastic waste enter the oceans each year, harming marine life and entering the food chain. Efforts to reduce plastic use, improve recycling, and develop biodegradable alternatives are gaining momentum.

Renewable energy offers a path toward a more sustainable future. Solar, wind, and hydroelectric power are becoming increasingly cost-effective and are being deployed at scale around the world. The transition to clean energy is not just an environmental imperative but also an economic opportunity.

Individuals, communities, governments, and businesses all have a role to play in addressing environmental challenges. From reducing consumption and waste to supporting conservation efforts and advocating for policy change, every action counts in the effort to protect our planet for future generations.`
    },
    'health': {
      title: 'Advances in Health and Medicine',
      content: `The field of health and medicine is experiencing remarkable advances that are extending lives and improving quality of life for people around the world. From new treatments for chronic diseases to innovations in public health, the pace of medical progress continues to accelerate.

Vaccination has been one of the most successful public health interventions in history, preventing millions of deaths each year from infectious diseases. The rapid development of COVID-19 vaccines demonstrated the power of modern biotechnology and the importance of global cooperation in addressing health crises.

Mental health has gained recognition as a critical component of overall health and well-being. Increased awareness has reduced stigma and led to expanded access to mental health services. Research into the neural basis of mental disorders is paving the way for more effective treatments.

Precision medicine, which tailors treatment to individual genetic profiles, is transforming how we approach disease. By understanding the genetic basis of conditions such as cancer, heart disease, and rare genetic disorders, doctors can choose treatments that are most likely to be effective for each patient.

Telemedicine has expanded access to healthcare, particularly in rural and underserved areas. The COVID-19 pandemic accelerated the adoption of virtual healthcare services, demonstrating that many aspects of medical care can be delivered effectively remotely.

The integration of technology into healthcare continues to create new possibilities. Wearable devices can monitor vital signs and detect early warning signs of health problems. Artificial intelligence is being used to analyze medical images, predict disease outbreaks, and assist in drug discovery.`
    }
  };

  const defaultContent = templates[topic.toLowerCase()] || {
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    content: `${topic.charAt(0).toUpperCase() + topic.slice(1)} is a topic of significant interest and importance in today's world. This article explores various aspects of the subject, providing readers with a comprehensive overview.

Recent developments in this field have attracted attention from experts and the general public alike. Researchers and professionals continue to study and analyze the implications of these changes, seeking to understand their broader impact.

The topic encompasses a wide range of perspectives and viewpoints. Some experts emphasize the opportunities that these developments present, while others caution about potential risks and challenges. Understanding both sides of the argument is essential for forming a well-informed opinion.

As our understanding of this subject continues to evolve, new questions arise that will shape future research and discussion. The ongoing dialogue surrounding ${topic} reflects its significance in shaping our world and our collective future.`
  };

  return defaultContent;
}

// Fallback search when RSS fails
app.get('/api/fallback-search', (req, res) => {
  const topic = (req.query.topic || 'technology').toLowerCase();
  const fallback = generateFallbackPassage(topic, 'medium');
  res.json({
    success: true,
    articles: [{
      title: fallback.title,
      link: '',
      content: fallback.content,
      pubDate: new Date().toISOString(),
      source: 'NewsLearn Content Library'
    }]
  });
});

app.listen(PORT, () => {
  console.log(`NewsLearn server running on http://localhost:${PORT}`);
});

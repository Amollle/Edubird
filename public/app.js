// NewsLearn - Client Application

let currentState = {
  articles: [],
  selectedArticle: null,
  passage: null,
  questions: [],
  tokens: 20,
  history: JSON.parse(localStorage.getItem('nl_history') || '[]')
};

const DOM = {
  generatorView: () => document.getElementById('generator-view'),
  passageView: () => document.getElementById('passage-view'),
  loadingView: () => document.getElementById('loading-view'),
  topicInput: () => document.getElementById('topic-input'),
  searchResults: () => document.getElementById('search-results'),
  generateBtn: () => document.getElementById('generateBtn'),
  passageTitle: () => document.getElementById('passage-title'),
  passageText: () => document.getElementById('passage-text'),
  passageSource: () => document.getElementById('passage-source'),
  passageWordCount: () => document.getElementById('passage-word-count'),
  questionsList: () => document.getElementById('questions-list'),
  questionsContainer: () => document.getElementById('questions-container'),
  loadingText: () => document.getElementById('loading-text'),
  tokenCount: () => document.getElementById('token-count'),
  gradeSelect: () => document.getElementById('grade-select'),
  qCount: () => document.getElementById('q-count'),
  backBtn: () => document.getElementById('back-to-generator'),
  topicChips: () => document.querySelectorAll('.topic-chip'),
  navGenerator: () => document.getElementById('nav-generator'),
  sideGenerator: () => document.getElementById('side-generator')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateTokenDisplay();
});

function setupEventListeners() {
  const topicInput = DOM.topicInput();
  const generateBtn = DOM.generateBtn();
  const backBtn = DOM.backBtn();
  const navGen = DOM.navGenerator();
  const sideGen = DOM.sideGenerator();

  // Debounced search
  let searchTimeout;
  topicInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const val = topicInput.value.trim();
    if (val.length >= 2) {
      searchTimeout = setTimeout(() => searchNews(val), 400);
    } else {
      DOM.searchResults().classList.add('hidden');
    }
  });

  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = topicInput.value.trim();
      if (val) searchNews(val);
    }
  });

  generateBtn.addEventListener('click', generatePassage);

  backBtn.addEventListener('click', showGeneratorView);

  // Topic chips
  DOM.topicChips().forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.textContent.trim().replace('# ', '');
      topicInput.value = topic;
      searchNews(topic);
    });
  });

  // Navigation
  navGen.addEventListener('click', (e) => { e.preventDefault(); showGeneratorView(); });
  sideGen.addEventListener('click', (e) => { e.preventDefault(); showGeneratorView(); });
}

function showGeneratorView() {
  DOM.generatorView().classList.remove('hidden');
  DOM.passageView().classList.add('hidden');
  DOM.loadingView().classList.add('hidden');
}

function showLoading(text) {
  DOM.generatorView().classList.add('hidden');
  DOM.passageView().classList.add('hidden');
  DOM.loadingView().classList.remove('hidden');
  DOM.loadingText().textContent = text || 'Loading...';
}

async function searchNews(topic) {
  showLoading(`Searching for articles about "${topic}"...`);
  DOM.searchResults().classList.add('hidden');

  try {
    const res = await fetch(`/api/search?topic=${encodeURIComponent(topic)}`);
    const data = await res.json();

    if (data.success && data.articles.length > 0) {
      currentState.articles = data.articles;
      displaySearchResults(data.articles);
      showGeneratorView();
    } else {
      // Try fallback
      const fallbackRes = await fetch(`/api/fallback-search?topic=${encodeURIComponent(topic)}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.articles.length > 0) {
        currentState.articles = fallbackData.articles;
        displaySearchResults(fallbackData.articles);
        showGeneratorView();
      } else {
        showGeneratorView();
        DOM.searchResults().classList.remove('hidden');
        DOM.searchResults().innerHTML = `
          <div class="glass-card p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <div class="flex items-center gap-3 text-on-surface-variant">
              <span class="material-symbols-outlined">info</span>
              <p class="font-body-ui">No articles found for "${topic}". Try a different search term or use the suggested topics above.</p>
            </div>
          </div>`;
      }
    }
  } catch (err) {
    console.error('Search error:', err);
    // Try fallback
    try {
      const fallbackRes = await fetch(`/api/fallback-search?topic=${encodeURIComponent(topic)}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.articles.length > 0) {
        currentState.articles = fallbackData.articles;
        displaySearchResults(fallbackData.articles);
        showGeneratorView();
        return;
      }
    } catch (e) {}
    showGeneratorView();
    DOM.searchResults().classList.remove('hidden');
    DOM.searchResults().innerHTML = `
      <div class="glass-card p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div class="flex items-center gap-3 text-on-surface-variant">
          <span class="material-symbols-outlined text-error">error</span>
          <p class="font-body-ui">Unable to fetch news. Please check your connection and try again.</p>
        </div>
      </div>`;
  }
}

function displaySearchResults(articles) {
  const container = DOM.searchResults();
  container.classList.remove('hidden');
  
  const grade = DOM.gradeSelect().value;
  const qCount = parseInt(DOM.qCount().textContent);
  const length = document.querySelector('input[name="length"]:checked')?.value || 'medium';

  let html = `
    <div class="glass-card p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <label class="block font-title-md text-title-md text-on-surface mb-stack-md flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">newspaper</span>
        Select an Article
      </label>
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">`;

  articles.forEach((article, index) => {
    const date = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : '';
    html += `
      <div class="p-3 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary-container/5 transition-all cursor-pointer article-item" data-index="${index}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h4 class="font-label-sm text-label-sm text-on-surface font-semibold truncate">${escapeHtml(article.title)}</h4>
            <p class="text-caption text-on-surface-variant mt-1 line-clamp-2">${escapeHtml(article.content.substring(0, 150))}...</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-caption text-on-surface-variant">${escapeHtml(article.source)}</span>
              ${date ? `<span class="text-caption text-on-surface-variant">· ${date}</span>` : ''}
            </div>
          </div>
          <button class="shrink-0 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm font-bold hover:opacity-90 transition-opacity select-article-btn" data-index="${index}">
            Select
          </button>
        </div>
      </div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  // Add event listeners
  container.querySelectorAll('.select-article-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      if (currentState.articles[index]) {
        currentState.selectedArticle = currentState.articles[index];
        // Auto-generate with selected article
        generateFromArticle(currentState.selectedArticle);
      }
    });
  });

  container.querySelectorAll('.article-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      if (currentState.articles[index]) {
        currentState.selectedArticle = currentState.articles[index];
        generateFromArticle(currentState.articles[index]);
      }
    });
  });
}

function generateFromArticle(article) {
  const grade = DOM.gradeSelect().value;
  const qCount = parseInt(DOM.qCount().textContent);
  const length = document.querySelector('input[name="length"]:checked')?.value || 'medium';
  
  showLoading('Generating your reading passage...');
  
  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      source: article.source,
      grade,
      questionCount: qCount,
      length
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentState.passage = data.passage;
      currentState.questions = data.questions;
      displayPassage(data.passage, data.questions);
      // Use a token
      useToken();
      // Save to history
      saveToHistory(data.passage, data.questions);
    } else {
      showGeneratorView();
      alert('Failed to generate passage: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('Generate error:', err);
    showGeneratorView();
    alert('Failed to generate passage. Please try again.');
  });
}

async function generatePassage() {
  const topic = DOM.topicInput().value.trim();
  if (!topic) {
    DOM.topicInput().focus();
    DOM.topicInput().classList.add('border-error');
    setTimeout(() => DOM.topicInput().classList.remove('border-error'), 2000);
    return;
  }

  // If we have articles from search and one is selected, use it
  if (currentState.selectedArticle) {
    generateFromArticle(currentState.selectedArticle);
    return;
  }

  // Search first, then auto-generate from first result
  showLoading(`Searching for "${topic}"...`);
  
  try {
    const res = await fetch(`/api/search?topic=${encodeURIComponent(topic)}`);
    const data = await res.json();
    
    if (data.success && data.articles.length > 0) {
      currentState.articles = data.articles;
      currentState.selectedArticle = data.articles[0];
      generateFromArticle(data.articles[0]);
    } else {
      // Try fallback
      const fallbackRes = await fetch(`/api/fallback-search?topic=${encodeURIComponent(topic)}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.articles.length > 0) {
        currentState.articles = fallbackData.articles;
        currentState.selectedArticle = fallbackData.articles[0];
        generateFromArticle(fallbackData.articles[0]);
      } else {
        showGeneratorView();
        alert('No articles found for "' + topic + '". Please try a different topic.');
      }
    }
  } catch (err) {
    // Fallback
    try {
      const fallbackRes = await fetch(`/api/fallback-search?topic=${encodeURIComponent(topic)}`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.articles.length > 0) {
        currentState.articles = fallbackData.articles;
        currentState.selectedArticle = fallbackData.articles[0];
        generateFromArticle(fallbackData.articles[0]);
        return;
      }
    } catch (e) {}
    showGeneratorView();
    alert('Unable to generate passage. Please try again.');
  }
}

function displayPassage(passage, questions) {
  DOM.passageTitle().textContent = passage.title || 'Reading Passage';
  DOM.passageText().innerHTML = passage.text.split('\n').filter(p => p.trim()).map(p => `<p class="mb-4 leading-[2]">${p.trim()}</p>`).join('');
  DOM.passageSource().textContent = passage.source || 'News Article';
  DOM.passageWordCount().textContent = `${passage.wordCount || 0} words`;

  // Display questions
  const list = DOM.questionsList();
  list.innerHTML = '';

  if (questions && questions.length > 0) {
    DOM.questionsContainer().classList.remove('hidden');
    questions.forEach((q, idx) => {
      const qCard = document.createElement('div');
      qCard.className = 'glass-card p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] question-card border border-outline-variant';
      
      const typeIcons = { main_idea: 'lightbulb', detail: 'search', vocabulary: 'book', inference: 'psychology', purpose: 'flag' };
      const typeLabels = { main_idea: 'Main Idea', detail: 'Detail', vocabulary: 'Vocabulary', inference: 'Inference', purpose: 'Purpose' };
      
      qCard.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-primary text-[20px]">${typeIcons[q.type] || 'quiz'}</span>
          <span class="text-caption font-label-sm text-primary font-semibold uppercase">${typeLabels[q.type] || 'Question'} ${idx + 1}</span>
        </div>
        <p class="font-body-ui text-body-ui text-on-surface font-medium mb-4">${escapeHtml(q.question)}</p>
        <div class="space-y-2">
          ${q.options && q.options.length > 0 ? q.options.map((opt, oi) => `
            <label class="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all cursor-pointer option-label ${oi === 0 ? 'is-correct' : ''}" data-question="${idx}" data-option="${oi}">
              <input type="radio" name="q_${idx}" value="${oi}" class="mt-0.5 text-primary focus:ring-primary"/>
              <span class="text-body-ui text-sm text-on-surface">${escapeHtml(opt)}</span>
            </label>
          `).join('') : ''}
        </div>
        <div class="mt-4 pt-3 border-t border-outline-variant hidden answer-reveal" id="answer-${idx}">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined text-secondary text-[20px] shrink-0">check_circle</span>
            <div>
              <p class="font-label-sm text-label-sm text-secondary font-semibold mb-1">Answer</p>
              <p class="text-body-ui text-sm text-on-surface">${escapeHtml(q.answer)}</p>
            </div>
          </div>
        </div>
        <button class="mt-3 text-primary font-label-sm text-label-sm font-semibold hover:opacity-80 transition-opacity show-answer-btn" data-question="${idx}">Show Answer</button>
      `;

      list.appendChild(qCard);
    });

    // Add event listeners for show answer buttons and radio options
    list.querySelectorAll('.show-answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.question;
        const answerDiv = document.getElementById(`answer-${idx}`);
        answerDiv.classList.toggle('hidden');
        btn.textContent = answerDiv.classList.contains('hidden') ? 'Show Answer' : 'Hide Answer';
      });
    });

    list.querySelectorAll('.option-label').forEach(label => {
      label.addEventListener('click', () => {
        const qIdx = label.dataset.question;
        const optIdx = parseInt(label.dataset.option);
        // Show answer when any option is clicked
        const answerDiv = document.getElementById(`answer-${qIdx}`);
        answerDiv.classList.remove('hidden');
        const btn = document.querySelector(`.show-answer-btn[data-question="${qIdx}"]`);
        if (btn) btn.textContent = 'Hide Answer';
        
        // Highlight selected
        document.querySelectorAll(`.option-label[data-question="${qIdx}"]`).forEach(l => {
          l.classList.remove('border-primary', 'bg-primary-container/10');
        });
        label.classList.add('border-primary', 'bg-primary-container/10');
      });
    });
  } else {
    DOM.questionsContainer().classList.add('hidden');
  }

  // Switch views
  DOM.generatorView().classList.add('hidden');
  DOM.loadingView().classList.add('hidden');
  DOM.passageView().classList.remove('hidden');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function useToken() {
  if (currentState.tokens > 0) {
    currentState.tokens--;
    updateTokenDisplay();
  }
}

function updateTokenDisplay() {
  DOM.tokenCount().textContent = `${currentState.tokens} Tokens`;
}

function saveToHistory(passage, questions) {
  const entry = {
    id: Date.now(),
    title: passage.title,
    source: passage.source,
    wordCount: passage.wordCount,
    date: new Date().toISOString(),
    questionCount: questions ? questions.length : 0
  };
  currentState.history.unshift(entry);
  if (currentState.history.length > 20) currentState.history.pop();
  localStorage.setItem('nl_history', JSON.stringify(currentState.history));
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global functions used by HTML
function increment(id) {
  const el = document.getElementById(id);
  let val = parseInt(el.innerText);
  if (val < 20) el.innerText = val + 1;
}

function decrement(id) {
  const el = document.getElementById(id);
  let val = parseInt(el.innerText);
  if (val > 1) el.innerText = val - 1;
}

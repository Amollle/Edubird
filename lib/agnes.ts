type AgnesMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AgnesChatParams = {
  messages: AgnesMessage[];
  temperature?: number;
  model?: string;
  maxTokens?: number;
};

type AgnesImageParams = {
  prompt: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  model?: string;
};

function getAgnesConfig() {
  return {
    apiKey: process.env.AGNES_API_KEY,
    baseUrl: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    model: process.env.AGNES_MODEL || 'agnes-2.0-flash',
    imageModel: process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.1-flash'
  };
}

export async function agnesChat(params: AgnesChatParams) {
  const config = getAgnesConfig();

  if (!config.apiKey) {
    throw new Error('Missing AGNES_API_KEY');
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: params.model || config.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      ...(params.maxTokens ? { max_tokens: params.maxTokens } : {})
    })
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Agnes chat request failed: ${response.status} ${bodyText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Agnes chat response missing content.');
  }

  return content;
}

export async function agnesGenerateImage(params: AgnesImageParams) {
  const config = getAgnesConfig();

  if (!config.apiKey) {
    throw new Error('Missing AGNES_API_KEY');
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: params.model || config.imageModel,
      prompt: params.prompt,
      size: params.size || '1024x1024'
    })
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Agnes image request failed: ${response.status} ${bodyText.slice(0, 300)}`);
  }

  const data = await response.json();
  const imageUrl = data?.data?.[0]?.url;

  if (typeof imageUrl !== 'string') {
    throw new Error('Agnes image response missing url.');
  }

  return imageUrl;
}

import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    const trimmed = ENV.forgeApiUrl.replace(/\/$/, "");
    // If user provided a full Google Generative URL (or any URL containing /v1 or generateContent), use it as-is
    if (trimmed.includes("generativelanguage.googleapis.com") || /\/v\d+/i.test(trimmed) || trimmed.includes("generateContent")) {
      return trimmed;
    }

    return `${trimmed}/v1/chat/completions`;
  }

  return "https://forge.manus.im/v1/chat/completions";
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768
  payload.thinking = {
    "budget_tokens": 128
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const apiUrl = resolveApiUrl();

  // Build request body depending on target
  let requestBody: unknown = payload;

  // If target looks like Google's Generative Language API, convert payload to that shape
  if (apiUrl.includes("generativelanguage.googleapis.com") || apiUrl.includes("googleapis.com") || apiUrl.includes("generateContent")) {
    // Flatten messages into a single prompt text
    const prompt = (payload.messages as any[])
      .map((m: any) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n\n");

    requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: (() => {
      // If target looks like Google's Generative Language API, use X-goog-api-key
      if (apiUrl.includes("generativelanguage.googleapis.com") || apiUrl.includes("googleapis.com")) {
        return {
          "content-type": "application/json",
          "X-goog-api-key": ENV.forgeApiKey,
        } as Record<string, string>;
      }

      return {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      } as Record<string, string>;
    })(),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  // If the endpoint is Google's Generative Language API, adapt the response to our InvokeResult shape
  const url = resolveApiUrl();
  if (url.includes("generativelanguage.googleapis.com") || url.includes("googleapis.com")) {
    const json = await response.json().catch(() => ({}));
    // Try to extract text from common candidate shapes
    let text = "";
    try {
      if (Array.isArray(json.candidates) && json.candidates.length > 0) {
        const cand = json.candidates[0] as any;
        if (cand && typeof cand === "object") {
          // Google sometimes nests text at candidate.content.parts[0].text
          if (cand.content && Array.isArray(cand.content.parts) && cand.content.parts.length > 0) {
            const part = cand.content.parts[0];
            if (part && typeof part.text === "string") {
              text = part.text;
            }
          }

          // candidate.content may be an array of parts in other variants
          if (!text && Array.isArray(cand.content) && cand.content.length > 0) {
            const first = cand.content[0];
            if (first && typeof first === "object" && typeof (first as any).text === "string") {
              text = (first as any).text;
            }
          }

          // fallback to cand.output or cand.text
          if (!text && typeof cand.output === "string") text = cand.output;
          if (!text && typeof cand.text === "string") text = cand.text;
        }
      }

      // Another possible top-level: json.output[0].content[0].text or output[].content[].parts[].text
      if (!text && Array.isArray((json as any).output)) {
        const o = (json as any).output[0];
        if (o) {
          if (Array.isArray(o.content) && o.content[0] && typeof o.content[0].text === "string") {
            text = o.content[0].text;
          }

          if (!text && o.content && Array.isArray(o.content.parts) && o.content.parts[0] && typeof o.content.parts[0].text === "string") {
            text = o.content.parts[0].text;
          }
        }
      }
    } catch (err) {
      // ignore parse errors
    }

    // fallback to raw stringified body
    if (!text) {
      try {
        text = JSON.stringify(json);
      } catch (err) {
        text = String(json);
      }
    }

    const out: InvokeResult = {
      id: `g-${Date.now()}`,
      created: Date.now(),
      model: "gemini-flash-latest",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: text,
          },
          finish_reason: null,
        },
      ],
    };

    return out;
  }

  return (await response.json()) as InvokeResult;
}

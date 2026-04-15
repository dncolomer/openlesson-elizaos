// src/client.ts
var BASE_URL = "https://www.openlesson.academy";
var API_VERSION = "v2";
function getApiKey(runtime) {
  const key = runtime.getSetting("OPENLESSON_API_KEY");
  if (!key) {
    throw new Error(
      "OPENLESSON_API_KEY not configured. Set it in your character settings."
    );
  }
  return key;
}
async function apiRequest(runtime, method, path, body, query) {
  const apiKey = getApiKey(runtime);
  let url = `${BASE_URL}/api/${API_VERSION}/agent${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== void 0 && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const init = { method, headers };
  if (body !== void 0) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return await response.json();
}

// src/actions/listKeys.ts
var listKeysAction = {
  name: "LIST_API_KEYS",
  similes: ["SHOW_KEYS", "MY_KEYS", "VIEW_API_KEYS", "GET_KEYS"],
  description: "List all API keys for the authenticated user",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        "/keys"
      );
      if (data.keys.length === 0) {
        callback?.({ text: "No API keys found.", action: "LIST_API_KEYS" });
        return;
      }
      let responseText = `Found ${data.keys.length} API keys:`;
      data.keys.forEach((k) => {
        const status = k.is_active ? "active" : "revoked";
        const expiry = k.expires_at ? `, expires: ${k.expires_at}` : "";
        responseText += `
- ${k.key_prefix}... (${status}) \u2014 scopes: [${k.scopes.join(", ")}]${expiry}`;
        if (k.label) responseText += ` \u2014 "${k.label}"`;
      });
      callback?.({ text: responseText, action: "LIST_API_KEYS" });
    } catch (error) {
      callback?.({
        text: `Failed to list API keys: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_API_KEYS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my API keys" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Found 2 API keys:\n- sk_abc... (active) \u2014 scopes: [*] \u2014 "Production"\n- sk_def... (revoked) \u2014 scopes: [plans:read, sessions:read]',
          action: "LIST_API_KEYS"
        }
      }
    ]
  ]
};

// src/actions/createKey.ts
var createKeyAction = {
  name: "CREATE_API_KEY",
  similes: ["NEW_KEY", "GENERATE_KEY", "MAKE_KEY", "ADD_KEY"],
  description: "Create a new API key with optional label, scopes, and expiration",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const labelMatch = text.match(/label[:\s]*["']([^"']+)["']/i);
    const expiryMatch = text.match(/(?:expires?|expiry)[:\s]*(\d+)\s*days?/i);
    const scopesMatch = text.match(
      /scopes?[:\s]*\[([^\]]+)\]/i
    );
    try {
      const body = {};
      if (labelMatch) body.label = labelMatch[1].trim();
      if (expiryMatch)
        body.expires_in_days = parseInt(expiryMatch[1], 10);
      if (scopesMatch) {
        body.scopes = scopesMatch[1].split(",").map((s) => s.trim().replace(/["']/g, ""));
      }
      const data = await apiRequest(
        runtime,
        "POST",
        "/keys",
        Object.keys(body).length > 0 ? body : void 0
      );
      let responseText = `API key created: ${data.api_key}`;
      responseText += `
Key ID: ${data.key.id}`;
      responseText += `
Scopes: [${data.key.scopes.join(", ")}]`;
      if (data.key.expires_at) {
        responseText += `
Expires: ${data.key.expires_at}`;
      }
      responseText += "\n\nIMPORTANT: Save this key now \u2014 it will not be shown again.";
      callback?.({ text: responseText, action: "CREATE_API_KEY" });
    } catch (error) {
      callback?.({
        text: `Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_API_KEY"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: 'Create an API key label: "My Agent" expires 30 days'
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "API key created: sk_abc123def456...\nKey ID: key_xyz789\nScopes: [*]\nExpires: 2025-02-15T00:00:00Z\n\nIMPORTANT: Save this key now \u2014 it will not be shown again.",
          action: "CREATE_API_KEY"
        }
      }
    ]
  ]
};

// src/actions/revokeKey.ts
var revokeKeyAction = {
  name: "REVOKE_API_KEY",
  similes: ["DELETE_KEY", "REMOVE_KEY", "DISABLE_KEY", "DEACTIVATE_KEY"],
  description: "Revoke (soft-delete) an API key",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/key[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const keyId = idMatch?.[1] ?? state?.key_id;
    if (!keyId) {
      callback?.({
        text: "Please provide a key ID to revoke. Example: 'Revoke key key_abc123'.",
        action: "REVOKE_API_KEY"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "DELETE",
        `/keys/${keyId}`
      );
      callback?.({
        text: `API key ${data.key_id} revoked.`,
        action: "REVOKE_API_KEY"
      });
    } catch (error) {
      callback?.({
        text: `Failed to revoke API key: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "REVOKE_API_KEY"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Revoke key key_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "API key key_abc123 revoked.",
          action: "REVOKE_API_KEY"
        }
      }
    ]
  ]
};

// src/actions/updateKeyScopes.ts
var updateKeyScopesAction = {
  name: "UPDATE_KEY_SCOPES",
  similes: [
    "CHANGE_KEY_SCOPES",
    "SET_KEY_SCOPES",
    "MODIFY_KEY_SCOPES",
    "EDIT_KEY_SCOPES"
  ],
  description: "Update the scopes on an existing API key",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/key[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const keyId = idMatch?.[1] ?? state?.key_id;
    if (!keyId) {
      callback?.({
        text: "Please provide a key ID. Example: 'Update scopes for key key_abc123 to [plans:read, sessions:read]'.",
        action: "UPDATE_KEY_SCOPES"
      });
      return;
    }
    const scopesMatch = text.match(/scopes?[:\s]*\[([^\]]+)\]/i);
    if (!scopesMatch) {
      callback?.({
        text: "Please specify the scopes. Example: 'scopes: [plans:read, sessions:write]'.",
        action: "UPDATE_KEY_SCOPES"
      });
      return;
    }
    const scopes = scopesMatch[1].split(",").map((s) => s.trim().replace(/["']/g, ""));
    try {
      const data = await apiRequest(
        runtime,
        "PATCH",
        `/keys/${keyId}/scopes`,
        { scopes }
      );
      callback?.({
        text: `Key ${data.key.id} scopes updated to: [${data.key.scopes.join(", ")}].`,
        action: "UPDATE_KEY_SCOPES"
      });
    } catch (error) {
      callback?.({
        text: `Failed to update key scopes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "UPDATE_KEY_SCOPES"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Update scopes for key key_abc123 to [plans:read, sessions:read]"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Key key_abc123 scopes updated to: [plans:read, sessions:read].",
          action: "UPDATE_KEY_SCOPES"
        }
      }
    ]
  ]
};

// src/actions/listPlans.ts
var listPlansAction = {
  name: "LIST_PLANS",
  similes: ["SHOW_PLANS", "MY_PLANS", "VIEW_PLANS", "GET_PLANS"],
  description: "List learning plans with optional status filter and pagination",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const statusMatch = text.match(
      /(?:status|filter)[:\s]*(active|paused|completed|archived)/i
    );
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);
    try {
      const query = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);
      const data = await apiRequest(
        runtime,
        "GET",
        "/plans",
        void 0,
        query
      );
      if (data.plans.length === 0) {
        callback?.({
          text: "No learning plans found.",
          action: "LIST_PLANS"
        });
        return;
      }
      let responseText = `Found ${data.pagination.total} plans:`;
      data.plans.forEach((p) => {
        responseText += `
- ${p.title} (${p.status}) \u2014 ${p.topic}, ${p.duration_days} days. ID: ${p.id}`;
      });
      if (data.pagination.has_more) {
        responseText += `
... and ${data.pagination.total - data.plans.length} more.`;
      }
      callback?.({ text: responseText, action: "LIST_PLANS" });
    } catch (error) {
      callback?.({
        text: `Failed to list plans: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_PLANS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my learning plans" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Found 3 plans:\n- Quantum Computing (active) \u2014 quantum computing, 30 days. ID: plan_abc123\n- Python Basics (completed) \u2014 Python, 14 days. ID: plan_def456",
          action: "LIST_PLANS"
        }
      }
    ]
  ]
};

// src/actions/createPlan.ts
var createPlanAction = {
  name: "CREATE_LEARNING_PLAN",
  similes: [
    "GENERATE_LEARNING_PLAN",
    "MAKE_LEARNING_PLAN",
    "BUILD_STUDY_PLAN",
    "CREATE_STUDY_PLAN"
  ],
  description: "Create a personalized learning plan as a directed graph of tutoring sessions for a given topic",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const topicMatch = text.match(
      /(?:learning plan (?:for|about|on)|learn|study|plan for)\s+(.+?)(?:\s+in\s+(\d+)\s*(days?|weeks?))?$/i
    );
    const topic = topicMatch ? topicMatch[1].replace(/\s+in\s+\d+\s*(days?|weeks?)$/i, "").trim() : text.trim();
    let duration_days;
    const durationMatch = text.match(/(\d+)\s*(days?|weeks?)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      duration_days = unit.startsWith("week") ? num * 7 : num;
    }
    if (!topic) {
      callback?.({
        text: "Please specify a topic for the learning plan.",
        action: "CREATE_LEARNING_PLAN"
      });
      return;
    }
    const difficultyMatch = text.match(
      /(?:difficulty|level)[:\s]*(beginner|intermediate|advanced)/i
    );
    const contextMatch = text.match(
      /(?:context|background)[:\s]*["']?([^"']+)["']?/i
    );
    try {
      const body = { topic };
      if (duration_days) body.duration_days = duration_days;
      if (difficultyMatch) body.difficulty = difficultyMatch[1].toLowerCase();
      if (contextMatch) body.user_context = contextMatch[1].trim();
      const data = await apiRequest(
        runtime,
        "POST",
        "/plans",
        body
      );
      const startNode = data.nodes.find((n) => n.is_start);
      callback?.({
        text: `Learning plan created for "${data.plan.topic}" spanning ${data.plan.duration_days} days with ${data.node_count} sessions. Plan ID: ${data.plan.id}. First session: "${startNode?.title ?? "N/A"}".`,
        action: "CREATE_LEARNING_PLAN"
      });
    } catch (error) {
      callback?.({
        text: `Failed to create learning plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_LEARNING_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Create a learning plan for quantum computing" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Learning plan created for "quantum computing" spanning 30 days with 8 sessions. Plan ID: plan_abc123. First session: "Introduction to Qubits".',
          action: "CREATE_LEARNING_PLAN"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I want to learn Python in 2 weeks" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Learning plan created for "Python" spanning 14 days with 6 sessions. Plan ID: plan_def456. First session: "Python Basics".',
          action: "CREATE_LEARNING_PLAN"
        }
      }
    ]
  ]
};

// src/actions/getPlan.ts
var getPlanAction = {
  name: "GET_PLAN",
  similes: ["VIEW_PLAN", "SHOW_PLAN", "PLAN_DETAILS", "PLAN_INFO"],
  description: "Get a learning plan with its nodes and statistics",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID. Example: 'Show plan plan_abc123'.",
        action: "GET_PLAN"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/plans/${planId}`
      );
      let responseText = `Plan: ${data.plan.title} (${data.plan.status})`;
      responseText += `
Topic: ${data.plan.topic}, Duration: ${data.plan.duration_days} days`;
      responseText += `
Progress: ${data.statistics.progress_percent}% \u2014 ${data.statistics.completed_nodes}/${data.statistics.total_nodes} nodes completed`;
      responseText += `

Nodes:`;
      data.nodes.forEach((n) => {
        const marker = n.is_start ? " [START]" : "";
        responseText += `
- ${n.title} (${n.status})${marker}`;
      });
      callback?.({ text: responseText, action: "GET_PLAN" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show plan plan_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan: Quantum Computing (active)\nTopic: quantum computing, Duration: 30 days\nProgress: 25% \u2014 2/8 nodes completed\n\nNodes:\n- Introduction to Qubits (completed) [START]\n- Quantum Gates (in_progress)\n- Quantum Entanglement (pending)",
          action: "GET_PLAN"
        }
      }
    ]
  ]
};

// src/actions/updatePlan.ts
var updatePlanAction = {
  name: "UPDATE_PLAN",
  similes: [
    "EDIT_PLAN",
    "RENAME_PLAN",
    "SET_PLAN_STATUS",
    "PLAN_NOTES"
  ],
  description: "Update a learning plan's metadata \u2014 title, notes, or status (active, paused, completed, archived)",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID to update.",
        action: "UPDATE_PLAN"
      });
      return;
    }
    const titleMatch = text.match(/title[:\s]*["']([^"']+)["']/i);
    const notesMatch = text.match(/notes?[:\s]*["']([^"']+)["']/i);
    const statusMatch = text.match(
      /status[:\s]*(active|paused|completed|archived)/i
    );
    const body = {};
    if (titleMatch) body.title = titleMatch[1].trim();
    if (notesMatch) body.notes = notesMatch[1].trim();
    if (statusMatch) body.status = statusMatch[1].toLowerCase();
    if (Object.keys(body).length === 0) {
      callback?.({
        text: `Please specify what to update: title, notes, or status. Example: 'Update plan plan_abc123 title: "New Title"'.`,
        action: "UPDATE_PLAN"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "PATCH",
        `/plans/${planId}`,
        body
      );
      const changedFields = Object.keys(data.changes).join(", ");
      callback?.({
        text: `Plan ${data.plan.id} updated. Changed: ${changedFields}.`,
        action: "UPDATE_PLAN"
      });
    } catch (error) {
      callback?.({
        text: `Failed to update plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "UPDATE_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: 'Update plan plan_abc123 title: "Advanced Quantum Computing"'
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_abc123 updated. Changed: title.",
          action: "UPDATE_PLAN"
        }
      }
    ]
  ]
};

// src/actions/deletePlan.ts
var deletePlanAction = {
  name: "DELETE_PLAN",
  similes: ["REMOVE_PLAN", "DESTROY_PLAN"],
  description: "Delete a learning plan, its nodes, and unlink associated sessions",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID to delete.",
        action: "DELETE_PLAN"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "DELETE",
        `/plans/${planId}`
      );
      callback?.({
        text: `Plan ${data.plan_id} deleted. ${data.nodes_deleted} nodes removed.`,
        action: "DELETE_PLAN"
      });
    } catch (error) {
      callback?.({
        text: `Failed to delete plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "DELETE_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Delete plan plan_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_abc123 deleted. 8 nodes removed.",
          action: "DELETE_PLAN"
        }
      }
    ]
  ]
};

// src/actions/getPlanNodes.ts
var getPlanNodesAction = {
  name: "GET_PLAN_NODES",
  similes: [
    "SHOW_PLAN_NODES",
    "PLAN_GRAPH",
    "VIEW_PLAN_NODES",
    "PLAN_STRUCTURE"
  ],
  description: "Get all nodes of a learning plan with edges and graph info",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID. Example: 'Show nodes for plan plan_abc123'.",
        action: "GET_PLAN_NODES"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/plans/${planId}/nodes`
      );
      let responseText = `Plan graph: ${data.graph_info.total_nodes} nodes, ${data.graph_info.total_edges} edges.`;
      responseText += `
Start nodes: ${data.graph_info.start_nodes.length}, Leaf nodes: ${data.graph_info.leaf_nodes.length}`;
      responseText += `

Nodes:`;
      data.nodes.forEach((n) => {
        const connections = n.next_node_ids.length > 0 ? ` -> [${n.next_node_ids.join(", ")}]` : " (leaf)";
        responseText += `
- ${n.title} (${n.status})${connections}`;
      });
      callback?.({ text: responseText, action: "GET_PLAN_NODES" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan nodes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN_NODES"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show the graph for plan plan_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan graph: 8 nodes, 10 edges.\nStart nodes: 1, Leaf nodes: 2\n\nNodes:\n- Introduction to Qubits (completed) -> [node_2, node_3]\n- Quantum Gates (in_progress) -> [node_4]",
          action: "GET_PLAN_NODES"
        }
      }
    ]
  ]
};

// src/actions/adaptPlan.ts
var adaptPlanAction = {
  name: "ADAPT_LEARNING_PLAN",
  similes: [
    "MODIFY_LEARNING_PLAN",
    "CHANGE_LEARNING_PLAN",
    "UPDATE_PLAN",
    "ADJUST_PLAN"
  ],
  description: "Adapt an existing learning plan by giving a natural-language instruction (e.g. skip intro, add practice)",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID to adapt. Example: 'Adapt plan plan_abc123: skip the intro sessions'.",
        action: "ADAPT_LEARNING_PLAN"
      });
      return;
    }
    const instruction = text.replace(/plan[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "").replace(/^[\s:,]+/, "").trim() || text.trim();
    const preserveMatch = text.match(
      /preserve[_\s]?completed[:\s]*(true|false)/i
    );
    const contextMatch = text.match(
      /(?:context|additional)[:\s]*["']?([^"']+)["']?$/i
    );
    try {
      const body = { instruction };
      if (preserveMatch)
        body.preserve_completed = preserveMatch[1].toLowerCase() === "true";
      if (contextMatch) body.context = contextMatch[1].trim();
      const data = await apiRequest(
        runtime,
        "POST",
        `/plans/${planId}/adapt`,
        body
      );
      callback?.({
        text: `Plan ${data.plan_id} adapted. ${data.explanation} Changes: ${data.changes.created} created, ${data.changes.updated} updated, ${data.changes.deleted} deleted, ${data.changes.kept} kept. Now has ${data.nodes.length} sessions.`,
        action: "ADAPT_LEARNING_PLAN"
      });
    } catch (error) {
      callback?.({
        text: `Failed to adapt plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ADAPT_LEARNING_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Adapt plan plan_abc123: skip the intro sessions"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_abc123 adapted. Removed introductory sessions as requested. Changes: 0 created, 2 updated, 2 deleted, 4 kept. Now has 6 sessions.",
          action: "ADAPT_LEARNING_PLAN"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Add more practice problems to plan plan_def456" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan plan_def456 adapted. Added practice sessions for each topic. Changes: 3 created, 0 updated, 0 deleted, 6 kept. Now has 9 sessions.",
          action: "ADAPT_LEARNING_PLAN"
        }
      }
    ]
  ]
};

// src/actions/createPlanFromVideo.ts
var createPlanFromVideoAction = {
  name: "CREATE_PLAN_FROM_VIDEO",
  similes: [
    "PLAN_FROM_YOUTUBE",
    "VIDEO_LEARNING_PLAN",
    "YOUTUBE_PLAN",
    "LEARN_FROM_VIDEO"
  ],
  description: "Create a learning plan derived from a YouTube video URL",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const urlMatch = text.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/i
    );
    const youtubeUrl = urlMatch?.[0];
    if (!youtubeUrl) {
      callback?.({
        text: "Please provide a YouTube URL. Example: 'Create a plan from this video: https://youtube.com/watch?v=...'",
        action: "CREATE_PLAN_FROM_VIDEO"
      });
      return;
    }
    const durationMatch = text.match(/(\d+)\s*(days?|weeks?)/i);
    let duration_days;
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      duration_days = unit.startsWith("week") ? num * 7 : num;
    }
    try {
      const body = { youtube_url: youtubeUrl };
      if (duration_days) body.duration_days = duration_days;
      const data = await apiRequest(
        runtime,
        "POST",
        "/plans/from-video",
        body
      );
      const startNode = data.nodes.find((n) => n.is_start);
      callback?.({
        text: `Learning plan created from video for "${data.plan.topic}" spanning ${data.plan.duration_days} days with ${data.node_count} sessions. Plan ID: ${data.plan.id}. First session: "${startNode?.title ?? "N/A"}".`,
        action: "CREATE_PLAN_FROM_VIDEO"
      });
    } catch (error) {
      callback?.({
        text: `Failed to create plan from video: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_PLAN_FROM_VIDEO"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Create a plan from this video: https://youtube.com/watch?v=dQw4w9WgXcQ"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Learning plan created from video for "Music Theory Basics" spanning 14 days with 5 sessions. Plan ID: plan_vid789. First session: "Melody and Harmony".',
          action: "CREATE_PLAN_FROM_VIDEO"
        }
      }
    ]
  ]
};

// src/actions/listSessions.ts
var listSessionsAction = {
  name: "LIST_SESSIONS",
  similes: [
    "SHOW_SESSIONS",
    "MY_SESSIONS",
    "VIEW_SESSIONS",
    "GET_SESSIONS"
  ],
  description: "List tutoring sessions with optional status/plan_id filter and pagination",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const statusMatch = text.match(
      /(?:status|filter)[:\s]*(active|paused|completed|ended)/i
    );
    const planIdMatch = text.match(
      /plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);
    try {
      const query = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();
      if (planIdMatch) query.plan_id = planIdMatch[1];
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);
      const data = await apiRequest(
        runtime,
        "GET",
        "/sessions",
        void 0,
        query
      );
      if (data.sessions.length === 0) {
        callback?.({
          text: "No sessions found.",
          action: "LIST_SESSIONS"
        });
        return;
      }
      let responseText = `Found ${data.pagination.total} sessions:`;
      data.sessions.forEach((s) => {
        responseText += `
- ${s.problem} (${s.status}) \u2014 ID: ${s.id}`;
      });
      if (data.pagination.has_more) {
        responseText += `
... and ${data.pagination.total - data.sessions.length} more.`;
      }
      callback?.({ text: responseText, action: "LIST_SESSIONS" });
    } catch (error) {
      callback?.({
        text: `Failed to list sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_SESSIONS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my sessions" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Found 5 sessions:\n- Gradient Descent (completed) \u2014 ID: sess_abc123\n- Linear Algebra (active) \u2014 ID: sess_def456",
          action: "LIST_SESSIONS"
        }
      }
    ]
  ]
};

// src/actions/startSession.ts
var startSessionAction = {
  name: "START_SESSION",
  similes: [
    "BEGIN_SESSION",
    "START_TUTORING",
    "NEW_SESSION",
    "OPEN_SESSION"
  ],
  description: "Start a new tutoring session. Requires a topic; optionally linked to a plan via plan_id/plan_node_id. Sessions can be standalone.",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const topicMatch = text.match(
      /(?:session (?:about|on|for)|tutor(?:ing)? (?:on|about|for)|study|learn about)\s+(.+)/i
    );
    const topic = topicMatch ? topicMatch[1].trim() : text.trim();
    if (!topic) {
      callback?.({
        text: "Please specify a topic for the session.",
        action: "START_SESSION"
      });
      return;
    }
    const planIdMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = planIdMatch?.[1] ?? state?.plan_id;
    const nodeIdMatch = text.match(
      /node[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const planNodeId = nodeIdMatch?.[1] ?? state?.plan_node_id;
    const langMatch = text.match(
      /(?:language|lang|in)\s+(english|spanish|french|german|portuguese|chinese|japanese|korean|arabic|hindi|italian|dutch|russian|turkish)/i
    );
    try {
      const body = { topic };
      if (planId) body.plan_id = planId;
      if (planNodeId) body.plan_node_id = planNodeId;
      if (langMatch) body.tutoring_language = langMatch[1].toLowerCase();
      const data = await apiRequest(
        runtime,
        "POST",
        "/sessions",
        body
      );
      let responseText = `Tutoring session started for "${data.session.problem}". Session ID: ${data.session.id}. Status: ${data.session.status}.`;
      if (data.opening_probe) {
        responseText += `

First question: ${data.opening_probe}`;
      }
      callback?.({
        text: responseText,
        action: "START_SESSION"
      });
    } catch (error) {
      callback?.({
        text: `Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "START_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Start a tutoring session about gradient descent" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Tutoring session started for "gradient descent". Session ID: sess_abc123. Status: active.\n\nFirst question: What do you already know about optimization?',
          action: "START_SESSION"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I want to study linear algebra" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: 'Tutoring session started for "linear algebra". Session ID: sess_def456. Status: active.',
          action: "START_SESSION"
        }
      }
    ]
  ]
};

// src/actions/getSession.ts
var getSessionAction = {
  name: "GET_SESSION",
  similes: [
    "VIEW_SESSION",
    "SHOW_SESSION",
    "SESSION_DETAILS",
    "SESSION_INFO"
  ],
  description: "Get full session details including plan, statistics, and active probes",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show session sess_abc123'.",
        action: "GET_SESSION"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/sessions/${sessionId}`
      );
      const stats = data.statistics;
      const durationMin = Math.round(stats.duration_ms / 1e3 / 60);
      let responseText = `Session: ${data.session.problem} (${data.session.status})`;
      responseText += `
Duration: ${durationMin} min, ${stats.total_words} words, ${stats.transcript_chunks} chunks`;
      responseText += `
Probes: ${stats.total_probes} total (${stats.active_probes} active, ${stats.archived_probes} archived)`;
      responseText += `
Avg gap score: ${stats.avg_gap_score.toFixed(2)}`;
      if (data.active_probes.length > 0) {
        responseText += `

Active probes:`;
        data.active_probes.forEach((p) => {
          responseText += `
- ${p.text}`;
        });
      }
      callback?.({ text: responseText, action: "GET_SESSION" });
    } catch (error) {
      callback?.({
        text: `Failed to get session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session: gradient descent (active)\nDuration: 12 min, 450 words, 5 chunks\nProbes: 8 total (2 active, 6 archived)\nAvg gap score: 0.35\n\nActive probes:\n- What determines the size of each step?\n- How does momentum affect convergence?",
          action: "GET_SESSION"
        }
      }
    ]
  ]
};

// src/actions/analyzeHeartbeat.ts
function interpretGapScore(score) {
  if (score < 0.3) {
    return "Strong understanding \u2014 solid reasoning demonstrated";
  } else if (score < 0.6) {
    return "Moderate understanding \u2014 some reasoning gaps identified";
  }
  return "Significant reasoning gaps \u2014 follow-up recommended";
}
var analyzeHeartbeatAction = {
  name: "ANALYZE_HEARTBEAT",
  similes: [
    "SUBMIT_HEARTBEAT",
    "ANALYZE_RESPONSE",
    "CHECK_UNDERSTANDING",
    "SEND_HEARTBEAT"
  ],
  description: "Submit a multimodal heartbeat (text, audio, or image input) for analysis during an active session. Returns gap score, plan updates, and probing questions.",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Analyze session sess_abc123: my explanation is...'",
        action: "ANALYZE_HEARTBEAT"
      });
      return;
    }
    const contentText = text.replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "").replace(/^[\s:,]+/, "").trim();
    const inputs = [];
    if (contentText) {
      inputs.push({ type: "text", content: contentText });
    }
    if (inputs.length === 0) {
      callback?.({
        text: "Please provide some content (text, audio, or image) to analyze.",
        action: "ANALYZE_HEARTBEAT"
      });
      return;
    }
    const stateObj = state;
    const context = {};
    if (stateObj?.active_probe_ids)
      context.active_probe_ids = stateObj.active_probe_ids;
    if (stateObj?.focused_probe_id)
      context.focused_probe_id = stateObj.focused_probe_id;
    try {
      const body = { inputs };
      if (Object.keys(context).length > 0) body.context = context;
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/analyze`,
        body
      );
      const gapScore = data.analysis.gap_score;
      const interpretation = interpretGapScore(gapScore);
      let responseText = `Analysis complete (gap score: ${gapScore.toFixed(2)}). ${interpretation}.`;
      if (data.analysis.understanding_summary) {
        responseText += `

${data.analysis.understanding_summary}`;
      }
      if (data.guidance.next_probe) {
        responseText += `

Next question: ${data.guidance.next_probe.text}`;
      }
      if (data.session_plan_update.changed) {
        responseText += `

Plan updated: step ${data.session_plan_update.current_step_index + 1}`;
        if (data.session_plan_update.current_step) {
          responseText += ` \u2014 ${data.session_plan_update.current_step.title}`;
        }
      }
      callback?.({
        text: responseText,
        action: "ANALYZE_HEARTBEAT"
      });
    } catch (error) {
      callback?.({
        text: `Failed to analyze heartbeat: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ANALYZE_HEARTBEAT"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Analyze session sess_abc123: I think gradient descent works by following the slope downhill"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Analysis complete (gap score: 0.35). Moderate understanding \u2014 some reasoning gaps identified.\n\nYou understand the basic intuition but missed the role of the learning rate.\n\nNext question: What determines the size of each step?",
          action: "ANALYZE_HEARTBEAT"
        }
      }
    ]
  ]
};

// src/actions/pauseSession.ts
var pauseSessionAction = {
  name: "PAUSE_SESSION",
  similes: ["HOLD_SESSION", "SUSPEND_SESSION", "BREAK_SESSION"],
  description: "Pause an active tutoring session",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID to pause.",
        action: "PAUSE_SESSION"
      });
      return;
    }
    const reasonMatch = text.match(
      /(?:reason|because)[:\s]*["']?([^"']+)["']?/i
    );
    const resumeMatch = text.match(/(\d+)\s*min(?:ute)?s?/i);
    try {
      const body = {};
      if (reasonMatch) body.reason = reasonMatch[1].trim();
      if (resumeMatch)
        body.estimated_resume_minutes = parseInt(resumeMatch[1], 10);
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/pause`,
        Object.keys(body).length > 0 ? body : void 0
      );
      const elapsed = Math.round(data.elapsed_ms / 1e3 / 60);
      callback?.({
        text: `Session ${data.session.id} paused after ${elapsed} minutes. You can resume any time.`,
        action: "PAUSE_SESSION"
      });
    } catch (error) {
      callback?.({
        text: `Failed to pause session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "PAUSE_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Pause session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 paused after 12 minutes. You can resume any time.",
          action: "PAUSE_SESSION"
        }
      }
    ]
  ]
};

// src/actions/resumeSession.ts
var resumeSessionAction = {
  name: "RESUME_SESSION",
  similes: ["CONTINUE_SESSION", "UNPAUSE_SESSION"],
  description: "Resume a previously paused tutoring session \u2014 returns a reorientation probe",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID to resume.",
        action: "RESUME_SESSION"
      });
      return;
    }
    const contextMatch = text.replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "").replace(/^[\s:,]+/, "").trim();
    try {
      const body = {};
      if (contextMatch) body.continuation_context = contextMatch;
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/resume`,
        Object.keys(body).length > 0 ? body : void 0
      );
      const pauseDuration = Math.round(
        data.current_context.pause_duration_ms / 1e3 / 60
      );
      let responseText = `Session ${data.session.id} resumed after ${pauseDuration} minutes.`;
      if (data.reorientation_probe) {
        responseText += `

Let's pick up: ${data.reorientation_probe}`;
      }
      callback?.({
        text: responseText,
        action: "RESUME_SESSION"
      });
    } catch (error) {
      callback?.({
        text: `Failed to resume session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "RESUME_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Resume session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 resumed after 15 minutes.\n\nLet's pick up: Before the break, we were discussing gradient descent. Can you recall what determines the step size?",
          action: "RESUME_SESSION"
        }
      }
    ]
  ]
};

// src/actions/restartSession.ts
var restartSessionAction = {
  name: "RESTART_SESSION",
  similes: ["RESET_SESSION", "REDO_SESSION", "START_OVER_SESSION"],
  description: "Restart a session \u2014 archives probes, optionally clears transcript, generates a new plan and opening probe",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID to restart.",
        action: "RESTART_SESSION"
      });
      return;
    }
    const reasonMatch = text.match(
      /(?:reason|because)[:\s]*["']?([^"']+)["']?/i
    );
    const preserveMatch = text.match(
      /preserve[_\s]?transcript[:\s]*(true|false)/i
    );
    const strategyMatch = text.match(
      /(?:strategy|approach)[:\s]*["']?([^"']+)["']?/i
    );
    try {
      const body = {};
      if (reasonMatch) body.reason = reasonMatch[1].trim();
      if (preserveMatch)
        body.preserve_transcript = preserveMatch[1].toLowerCase() === "true";
      if (strategyMatch) body.new_strategy = strategyMatch[1].trim();
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/restart`,
        Object.keys(body).length > 0 ? body : void 0
      );
      let responseText = `Session ${data.session.id} restarted. Transcript ${data.transcript_preserved ? "preserved" : "cleared"}.`;
      if (data.opening_probe) {
        responseText += `

First question: ${data.opening_probe}`;
      }
      callback?.({
        text: responseText,
        action: "RESTART_SESSION"
      });
    } catch (error) {
      callback?.({
        text: `Failed to restart session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "RESTART_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Restart session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 restarted. Transcript cleared.\n\nFirst question: Let's start fresh \u2014 what do you already know about this topic?",
          action: "RESTART_SESSION"
        }
      }
    ]
  ]
};

// src/actions/endSession.ts
var endSessionAction = {
  name: "END_SESSION",
  similes: [
    "STOP_SESSION",
    "FINISH_SESSION",
    "CLOSE_SESSION",
    "COMPLETE_SESSION"
  ],
  description: "End an active tutoring session \u2014 generates a report and batch proof",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID to end.",
        action: "END_SESSION"
      });
      return;
    }
    const feedbackMatch = text.match(
      /(?:feedback|comment)[:\s]*["']?([^"']+)["']?/i
    );
    try {
      const body = {};
      if (feedbackMatch) body.user_feedback = feedbackMatch[1].trim();
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/end`,
        Object.keys(body).length > 0 ? body : void 0
      );
      const durationMin = Math.round(data.statistics.duration_ms / 1e3 / 60);
      let responseText = `Session ${data.session.id} ended. Duration: ${durationMin} min, ${data.statistics.total_probes} probes, avg gap score: ${data.statistics.avg_gap_score.toFixed(2)}.`;
      responseText += `
Batch proof: ${data.batch_proof.merkle_root.slice(0, 16)}...`;
      callback?.({
        text: responseText,
        action: "END_SESSION"
      });
    } catch (error) {
      callback?.({
        text: `Failed to end session: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "END_SESSION"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "End session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session sess_abc123 ended. Duration: 25 min, 8 probes, avg gap score: 0.32.\nBatch proof: sha256:a1b2c3d4...",
          action: "END_SESSION"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I'm done with this session" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session ended. Duration: 18 min, 5 probes, avg gap score: 0.45.\nBatch proof: sha256:e5f6a7b8...",
          action: "END_SESSION"
        }
      }
    ]
  ]
};

// src/actions/getSessionProbes.ts
var getSessionProbesAction = {
  name: "GET_SESSION_PROBES",
  similes: [
    "SHOW_PROBES",
    "LIST_PROBES",
    "SESSION_PROBES",
    "VIEW_PROBES"
  ],
  description: "List probes for a session with optional status filter (active, archived, all)",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show probes for session sess_abc123'.",
        action: "GET_SESSION_PROBES"
      });
      return;
    }
    const statusMatch = text.match(
      /(?:status|filter)[:\s]*(active|archived|all)/i
    );
    try {
      const query = {};
      if (statusMatch) query.status = statusMatch[1].toLowerCase();
      const data = await apiRequest(
        runtime,
        "GET",
        `/sessions/${sessionId}/probes`,
        void 0,
        query
      );
      if (data.probes.length === 0) {
        callback?.({
          text: `No probes found for session ${sessionId}.`,
          action: "GET_SESSION_PROBES"
        });
        return;
      }
      let responseText = `Probes for session: ${data.summary.total} total (${data.summary.active} active, ${data.summary.archived} archived)`;
      data.probes.forEach((p) => {
        responseText += `
- [${p.status}] ${p.text}`;
      });
      callback?.({ text: responseText, action: "GET_SESSION_PROBES" });
    } catch (error) {
      callback?.({
        text: `Failed to get probes: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PROBES"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show probes for session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Probes for session: 8 total (2 active, 6 archived)\n- [active] What determines the size of each step?\n- [active] How does momentum affect convergence?\n- [archived] What is the gradient?",
          action: "GET_SESSION_PROBES"
        }
      }
    ]
  ]
};

// src/actions/getSessionPlan.ts
var getSessionPlanAction = {
  name: "GET_SESSION_PLAN",
  similes: [
    "SHOW_SESSION_PLAN",
    "SESSION_STEPS",
    "VIEW_SESSION_PLAN",
    "TUTORING_PLAN"
  ],
  description: "Get the tutoring plan for a session with step statistics",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show plan for session sess_abc123'.",
        action: "GET_SESSION_PLAN"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/sessions/${sessionId}/plan`
      );
      const stats = data.step_statistics;
      let responseText = `Session Plan: ${data.plan.goal}`;
      responseText += `
Strategy: ${data.plan.strategy}`;
      responseText += `
Steps: ${stats.total} total \u2014 ${stats.completed} completed, ${stats.in_progress} in progress, ${stats.pending} pending, ${stats.skipped} skipped`;
      responseText += `
Current step: ${data.plan.current_step_index + 1}`;
      if (data.plan.steps.length > 0) {
        responseText += `

Steps:`;
        data.plan.steps.forEach((s, i) => {
          const marker = i === data.plan.current_step_index ? " <-" : "";
          responseText += `
${i + 1}. ${s.title} (${s.status})${marker}`;
        });
      }
      callback?.({ text: responseText, action: "GET_SESSION_PLAN" });
    } catch (error) {
      callback?.({
        text: `Failed to get session plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PLAN"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show the plan for session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session Plan: Understand gradient descent fundamentals\nStrategy: Socratic questioning\nSteps: 5 total \u2014 2 completed, 1 in progress, 2 pending, 0 skipped\nCurrent step: 3\n\nSteps:\n1. What is optimization? (completed)\n2. Derivatives and slopes (completed)\n3. The gradient descent algorithm (in_progress) <-\n4. Learning rate (pending)\n5. Convergence (pending)",
          action: "GET_SESSION_PLAN"
        }
      }
    ]
  ]
};

// src/actions/getSessionTranscript.ts
var getSessionTranscriptAction = {
  name: "GET_SESSION_TRANSCRIPT",
  similes: [
    "SHOW_TRANSCRIPT",
    "SESSION_TRANSCRIPT",
    "VIEW_TRANSCRIPT",
    "READ_TRANSCRIPT"
  ],
  description: "Get the transcript for a session in full, summary, or chunks format",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show transcript for session sess_abc123'.",
        action: "GET_SESSION_TRANSCRIPT"
      });
      return;
    }
    const formatMatch = text.match(
      /(?:format)[:\s]*(full|summary|chunks)/i
    );
    try {
      const query = {};
      if (formatMatch) query.format = formatMatch[1].toLowerCase();
      const data = await apiRequest(
        runtime,
        "GET",
        `/sessions/${sessionId}/transcript`,
        void 0,
        query
      );
      let responseText = `Transcript (${data.metadata.format}): ${data.metadata.chunk_count} chunks, ${data.metadata.total_words} words.`;
      if (data.transcript) {
        const preview = data.transcript.length > 500 ? data.transcript.slice(0, 500) + "..." : data.transcript;
        responseText += `

${preview}`;
      } else if (data.chunks && data.chunks.length > 0) {
        responseText += `

Chunks:`;
        data.chunks.slice(0, 10).forEach((c) => {
          responseText += `
- [${c.timestamp_ms}ms] ${c.word_count} words`;
          if (c.content) {
            const preview = c.content.length > 100 ? c.content.slice(0, 100) + "..." : c.content;
            responseText += `: ${preview}`;
          }
        });
      }
      callback?.({ text: responseText, action: "GET_SESSION_TRANSCRIPT" });
    } catch (error) {
      callback?.({
        text: `Failed to get transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_TRANSCRIPT"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show transcript for session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Transcript (full): 5 chunks, 450 words.\n\nGradient descent works by computing the gradient of the loss function with respect to the model parameters...",
          action: "GET_SESSION_TRANSCRIPT"
        }
      }
    ]
  ]
};

// src/actions/askAssistant.ts
var askAssistantAction = {
  name: "ASK_ASSISTANT",
  similes: [
    "ASK_TUTOR",
    "ASK_QUESTION",
    "SESSION_QUESTION",
    "HELP_ME"
  ],
  description: "Ask the teaching assistant a question within an active session. Supports conversation threading.",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Ask session sess_abc123: What is backpropagation?'",
        action: "ASK_ASSISTANT"
      });
      return;
    }
    const question = text.replace(/session[_\s]?(?:id)?[:\s]*[a-zA-Z0-9_-]+/i, "").replace(/^[\s:,]+/, "").trim() || text.trim();
    if (!question) {
      callback?.({
        text: "Please include a question to ask the assistant.",
        action: "ASK_ASSISTANT"
      });
      return;
    }
    const stateObj = state;
    const conversationId = stateObj?.conversation_id;
    try {
      const body = { question };
      if (conversationId) body.conversation_id = conversationId;
      const data = await apiRequest(
        runtime,
        "POST",
        `/sessions/${sessionId}/ask`,
        body
      );
      let responseText = data.response.content;
      if (data.response.suggested_follow_up && data.response.suggested_follow_up.length > 0) {
        responseText += "\n\nSuggested follow-ups:";
        data.response.suggested_follow_up.forEach((q, i) => {
          responseText += `
${i + 1}. ${q}`;
        });
      }
      callback?.({
        text: responseText,
        action: "ASK_ASSISTANT"
      });
    } catch (error) {
      callback?.({
        text: `Failed to ask assistant: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ASK_ASSISTANT"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Ask session sess_abc123: What is backpropagation?"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Backpropagation is the algorithm used to compute gradients in a neural network by propagating errors backward from the output layer to the input layer.\n\nSuggested follow-ups:\n1. How does the chain rule apply here?\n2. What is the vanishing gradient problem?",
          action: "ASK_ASSISTANT"
        }
      }
    ]
  ]
};

// src/actions/getConversationHistory.ts
var getConversationHistoryAction = {
  name: "GET_CONVERSATION_HISTORY",
  similes: [
    "SHOW_CONVERSATION",
    "VIEW_CONVERSATION",
    "CONVERSATION_MESSAGES",
    "CHAT_HISTORY"
  ],
  description: "Get the full message history for a teaching assistant conversation within a session",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    const convMatch = text.match(
      /conversation[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const conversationId = convMatch?.[1] ?? state?.conversation_id;
    if (!sessionId || !conversationId) {
      callback?.({
        text: "Please provide both a session ID and conversation ID. Example: 'Show conversation conv_abc123 for session sess_def456'.",
        action: "GET_CONVERSATION_HISTORY"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/sessions/${sessionId}/assistant/conversations/${conversationId}`
      );
      const msgs = data.conversation.messages;
      let responseText = `Conversation ${data.conversation.id} (${msgs.length} messages):`;
      msgs.forEach((m) => {
        const preview = m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content;
        responseText += `
[${m.role}]: ${preview}`;
      });
      callback?.({ text: responseText, action: "GET_CONVERSATION_HISTORY" });
    } catch (error) {
      callback?.({
        text: `Failed to get conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_CONVERSATION_HISTORY"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Show conversation conv_abc123 for session sess_def456"
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Conversation conv_abc123 (4 messages):\n[user]: What is backpropagation?\n[assistant]: Backpropagation is the algorithm used to compute gradients...\n[user]: How does the chain rule apply?\n[assistant]: The chain rule allows us to compute the derivative of a composite function...",
          action: "GET_CONVERSATION_HISTORY"
        }
      }
    ]
  ]
};

// src/actions/getAnalytics.ts
var getUserAnalyticsAction = {
  name: "GET_USER_ANALYTICS",
  similes: [
    "SHOW_ANALYTICS",
    "VIEW_ANALYTICS",
    "MY_STATS",
    "LEARNING_STATS",
    "SHOW_PROGRESS"
  ],
  description: "Retrieve user-wide analytics \u2014 overview, performance trends, learning history, and achievements",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        "/analytics/user"
      );
      let text = `Analytics Overview: ${data.overview.total_sessions} sessions, ${data.overview.total_plans} plans.`;
      text += `
Completion rates \u2014 plans: ${(data.overview.plan_completion_rate * 100).toFixed(0)}%, sessions: ${(data.overview.session_completion_rate * 100).toFixed(0)}%.`;
      text += `
Performance: gap score ${data.performance.overall_gap_score.toFixed(2)} (${data.performance.trend}).`;
      if (data.achievements.streaks.current_days > 0) {
        text += `
Streak: ${data.achievements.streaks.current_days} days (best: ${data.achievements.streaks.longest_days}).`;
      }
      if (data.learning_history.recent_topics.length > 0) {
        text += `
Recent topics: ${data.learning_history.recent_topics.slice(0, 5).join(", ")}.`;
      }
      callback?.({ text, action: "GET_USER_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_USER_ANALYTICS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my learning analytics" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Analytics Overview: 12 sessions, 3 plans.\nCompletion rates \u2014 plans: 67%, sessions: 83%.\nPerformance: gap score 0.42 (improving).\nStreak: 5 days (best: 12).\nRecent topics: Gradient Descent, Linear Algebra, Neural Networks.",
          action: "GET_USER_ANALYTICS"
        }
      }
    ]
  ]
};

// src/actions/getSessionAnalytics.ts
var getSessionAnalyticsAction = {
  name: "GET_SESSION_ANALYTICS",
  similes: [
    "SESSION_STATS",
    "SESSION_PERFORMANCE",
    "SHOW_SESSION_ANALYTICS",
    "SESSION_REPORT"
  ],
  description: "Get detailed analytics for a session \u2014 probes, gap timeline, plan progress, transcript stats",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show analytics for session sess_abc123'.",
        action: "GET_SESSION_ANALYTICS"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/analytics/sessions/${sessionId}`
      );
      let responseText = `Session Analytics: ${data.session.problem} (${data.session.status})`;
      responseText += `
Probes: ${data.probes.total} total (${data.probes.active} active, ${data.probes.archived} archived)`;
      responseText += `
Avg gap score: ${data.probes.avg_gap_score.toFixed(2)}`;
      if (data.gap_timeline.length > 0) {
        const trend = data.gap_timeline[data.gap_timeline.length - 1] < data.gap_timeline[0] ? "improving" : "needs work";
        responseText += `
Gap trend: ${trend} (${data.gap_timeline.map((g) => g.toFixed(2)).join(" -> ")})`;
      }
      if (data.probes.by_type && Object.keys(data.probes.by_type).length > 0) {
        responseText += `
Probe types: ${Object.entries(data.probes.by_type).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
      }
      callback?.({ text: responseText, action: "GET_SESSION_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get session analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_ANALYTICS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show analytics for session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Session Analytics: gradient descent (completed)\nProbes: 8 total (0 active, 8 archived)\nAvg gap score: 0.32\nGap trend: improving (0.65 -> 0.45 -> 0.30 -> 0.22)\nProbe types: conceptual: 4, application: 3, synthesis: 1",
          action: "GET_SESSION_ANALYTICS"
        }
      }
    ]
  ]
};

// src/actions/getPlanAnalytics.ts
var getPlanAnalyticsAction = {
  name: "GET_PLAN_ANALYTICS",
  similes: [
    "PLAN_STATS",
    "PLAN_PERFORMANCE",
    "PLAN_PROGRESS",
    "SHOW_PLAN_ANALYTICS"
  ],
  description: "Get detailed analytics for a learning plan \u2014 progress, sessions, performance, strongest/weakest topics, recommendations",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const planId = idMatch?.[1] ?? state?.plan_id;
    if (!planId) {
      callback?.({
        text: "Please provide a plan ID. Example: 'Show analytics for plan plan_abc123'.",
        action: "GET_PLAN_ANALYTICS"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/analytics/plans/${planId}`
      );
      let responseText = `Plan Analytics: ${data.plan.title}`;
      responseText += `
Progress: ${data.progress.progress_percent}% \u2014 ${data.progress.completed_nodes}/${data.progress.total_nodes} nodes`;
      responseText += `
Sessions: ${data.sessions.total} total, ${data.sessions.completed} completed`;
      responseText += `
Performance: avg gap ${data.performance.avg_gap_score.toFixed(2)} (${data.performance.trend})`;
      if (data.performance.strongest_topics.length > 0) {
        responseText += `
Strongest: ${data.performance.strongest_topics.join(", ")}`;
      }
      if (data.performance.weakest_topics.length > 0) {
        responseText += `
Weakest: ${data.performance.weakest_topics.join(", ")}`;
      }
      if (data.recommendations.length > 0) {
        responseText += `

Recommendations:`;
        data.recommendations.forEach((r, i) => {
          responseText += `
${i + 1}. ${r}`;
        });
      }
      callback?.({ text: responseText, action: "GET_PLAN_ANALYTICS" });
    } catch (error) {
      callback?.({
        text: `Failed to get plan analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PLAN_ANALYTICS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show analytics for plan plan_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Plan Analytics: Quantum Computing\nProgress: 50% \u2014 4/8 nodes\nSessions: 6 total, 4 completed\nPerformance: avg gap 0.38 (improving)\nStrongest: Qubits, Quantum Gates\nWeakest: Entanglement\n\nRecommendations:\n1. Review entanglement concepts before proceeding\n2. Try more practice problems on quantum circuits",
          action: "GET_PLAN_ANALYTICS"
        }
      }
    ]
  ]
};

// src/actions/listProofs.ts
var listProofsAction = {
  name: "LIST_PROOFS",
  similes: ["SHOW_PROOFS", "MY_PROOFS", "VIEW_PROOFS", "GET_PROOFS"],
  description: "List cryptographic proofs with optional filters (session_id, plan_id, type, anchored)",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const planMatch = text.match(
      /plan[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const typeMatch = text.match(
      /type[:\s]*(plan_created|plan_adapted|session_started|session_paused|session_resumed|session_ended|analysis_heartbeat|assistant_query|session_batch)/i
    );
    const anchoredMatch = text.match(/anchored[:\s]*(true|false)/i);
    const limitMatch = text.match(/(?:limit|show|top)\s*(\d+)/i);
    try {
      const query = {};
      if (sessionMatch) query.session_id = sessionMatch[1];
      if (planMatch) query.plan_id = planMatch[1];
      if (typeMatch) query.type = typeMatch[1].toLowerCase();
      if (anchoredMatch) query.anchored = anchoredMatch[1].toLowerCase();
      if (limitMatch) query.limit = parseInt(limitMatch[1], 10);
      const data = await apiRequest(
        runtime,
        "GET",
        "/proofs",
        void 0,
        query
      );
      if (data.proofs.length === 0) {
        callback?.({ text: "No proofs found.", action: "LIST_PROOFS" });
        return;
      }
      let responseText = `Found ${data.pagination.total} proofs:`;
      data.proofs.forEach((p) => {
        const anchor = p.anchored ? " [anchored]" : "";
        responseText += `
- ${p.proof_type} (${p.fingerprint.slice(0, 16)}...)${anchor} \u2014 ${p.created_at}`;
      });
      if (data.pagination.has_more) {
        responseText += `
... and ${data.pagination.total - data.proofs.length} more.`;
      }
      callback?.({ text: responseText, action: "LIST_PROOFS" });
    } catch (error) {
      callback?.({
        text: `Failed to list proofs: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "LIST_PROOFS"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me my proofs" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Found 12 proofs:\n- session_started (sha256:a1b2c3d4...) \u2014 2025-01-15T10:00:00Z\n- analysis_heartbeat (sha256:e5f6a7b8...) [anchored] \u2014 2025-01-15T10:05:00Z",
          action: "LIST_PROOFS"
        }
      }
    ]
  ]
};

// src/actions/getProof.ts
var getProofAction = {
  name: "GET_PROOF",
  similes: ["VIEW_PROOF", "SHOW_PROOF", "PROOF_DETAILS", "PROOF_INFO"],
  description: "Get full proof details including chain context, related proofs, and batch membership",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const proofId = idMatch?.[1] ?? state?.proof_id;
    if (!proofId) {
      callback?.({
        text: "Please provide a proof ID. Example: 'Show proof proof_abc123'.",
        action: "GET_PROOF"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/proofs/${proofId}`
      );
      let responseText = `Proof: ${data.proof.proof_type}`;
      responseText += `
Fingerprint: ${data.verification.fingerprint}`;
      responseText += `
Anchored: ${data.verification.anchored ? "yes" : "no"}`;
      responseText += `
Created: ${data.proof.created_at}`;
      if (data.chain.previous) {
        responseText += `
Previous proof: ${data.chain.previous.id}`;
      }
      if (data.chain.next) {
        responseText += `
Next proof: ${data.chain.next.id}`;
      }
      responseText += `
Related proofs: ${data.related_proofs.length}`;
      callback?.({ text: responseText, action: "GET_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to get proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_PROOF"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show proof proof_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof: session_started\nFingerprint: sha256:a1b2c3d4e5f6...\nAnchored: no\nCreated: 2025-01-15T10:00:00Z\nPrevious proof: proof_xyz789\nRelated proofs: 5",
          action: "GET_PROOF"
        }
      }
    ]
  ]
};

// src/actions/verifyProof.ts
var verifyProofAction = {
  name: "VERIFY_PROOF",
  similes: [
    "CHECK_PROOF",
    "VALIDATE_PROOF",
    "PROOF_INTEGRITY",
    "CONFIRM_PROOF"
  ],
  description: "Verify a proof's integrity \u2014 recalculates fingerprint, checks chain integrity and anchor validity",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const proofId = idMatch?.[1] ?? state?.proof_id;
    if (!proofId) {
      callback?.({
        text: "Please provide a proof ID to verify.",
        action: "VERIFY_PROOF"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/proofs/${proofId}/verify`
      );
      const fp = data.checks.fingerprint;
      const chain = data.checks.chain;
      const anchor = data.checks.anchor;
      let responseText = `Proof ${data.proof_id}: ${data.verified ? "VERIFIED" : "FAILED"}`;
      responseText += `
Fingerprint: ${fp.valid ? "valid" : "INVALID"} (stored: ${fp.stored.slice(0, 20)}...)`;
      responseText += `
Chain: ${chain.valid ? "valid" : "INVALID"}`;
      if (chain.details.previous_proof_id) {
        responseText += ` (prev: ${chain.details.previous_proof_id})`;
      }
      if (anchor.valid !== null) {
        responseText += `
Anchor: ${anchor.valid ? "valid" : "INVALID"}`;
        if (anchor.tx_signature) {
          responseText += ` (tx: ${anchor.tx_signature.slice(0, 16)}...)`;
        }
      } else {
        responseText += `
Anchor: not anchored`;
      }
      callback?.({ text: responseText, action: "VERIFY_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to verify proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "VERIFY_PROOF"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Verify proof proof_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof proof_abc123: VERIFIED\nFingerprint: valid (stored: sha256:a1b2c3d4e5f6...)\nChain: valid (prev: proof_xyz789)\nAnchor: not anchored",
          action: "VERIFY_PROOF"
        }
      }
    ]
  ]
};

// src/actions/anchorProof.ts
var anchorProofAction = {
  name: "ANCHOR_PROOF",
  similes: [
    "ANCHOR_ON_CHAIN",
    "BLOCKCHAIN_PROOF",
    "SUBMIT_PROOF",
    "ONCHAIN_PROOF"
  ],
  description: "Anchor a proof on Solana blockchain (currently simulated). Submits the proof fingerprint on-chain.",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i);
    const proofId = idMatch?.[1] ?? state?.proof_id;
    if (!proofId) {
      callback?.({
        text: "Please provide a proof ID to anchor.",
        action: "ANCHOR_PROOF"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "POST",
        `/proofs/${proofId}/anchor`
      );
      let responseText = `Proof ${data.proof.id}: ${data.status}. ${data.message}`;
      responseText += `
Tx: ${data.anchor.tx_signature}`;
      responseText += `
Slot: ${data.anchor.slot}`;
      if (data.anchor.simulated) {
        responseText += ` (simulated)`;
      }
      callback?.({ text: responseText, action: "ANCHOR_PROOF" });
    } catch (error) {
      callback?.({
        text: `Failed to anchor proof: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "ANCHOR_PROOF"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Anchor proof proof_abc123 on chain" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof proof_abc123: anchored. Proof anchored to Solana.\nTx: 5Kd8...a3Fb\nSlot: 123456789 (simulated)",
          action: "ANCHOR_PROOF"
        }
      }
    ]
  ]
};

// src/actions/getSessionProofBatch.ts
var getSessionProofBatchAction = {
  name: "GET_SESSION_PROOF_BATCH",
  similes: [
    "SHOW_PROOF_BATCH",
    "MERKLE_BATCH",
    "SESSION_BATCH",
    "VIEW_PROOF_BATCH"
  ],
  description: "Get the Merkle tree proof batch for a session \u2014 created when a session ends",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("OPENLESSON_API_KEY");
  },
  handler: async (runtime, message, state, _options, callback) => {
    const text = message.content.text ?? "";
    const sessionMatch = text.match(
      /session[_\s]?(?:id)?[:\s]*([a-zA-Z0-9_-]+)/i
    );
    const sessionId = sessionMatch?.[1] ?? state?.session_id;
    if (!sessionId) {
      callback?.({
        text: "Please provide a session ID. Example: 'Show proof batch for session sess_abc123'.",
        action: "GET_SESSION_PROOF_BATCH"
      });
      return;
    }
    try {
      const data = await apiRequest(
        runtime,
        "GET",
        `/proofs/session/${sessionId}/batch`
      );
      let responseText = `Proof Batch: ${data.batch.id}`;
      responseText += `
Merkle root: ${data.batch.merkle_root}`;
      responseText += `
Proofs: ${data.batch.proof_count}`;
      responseText += `
Anchored: ${data.batch.anchored ? "yes" : "no"}`;
      responseText += `
Leaves: ${data.merkle_tree.leaf_count}`;
      if (data.proofs.length > 0) {
        responseText += `

Proofs in batch:`;
        data.proofs.slice(0, 10).forEach((p) => {
          responseText += `
- ${p.proof_type} (${p.fingerprint.slice(0, 16)}...)`;
        });
        if (data.proofs.length > 10) {
          responseText += `
... and ${data.proofs.length - 10} more.`;
        }
      }
      callback?.({ text: responseText, action: "GET_SESSION_PROOF_BATCH" });
    } catch (error) {
      callback?.({
        text: `Failed to get proof batch: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "GET_SESSION_PROOF_BATCH"
      });
    }
    return;
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show proof batch for session sess_abc123" }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Proof Batch: batch_xyz789\nMerkle root: sha256:root123...\nProofs: 8\nAnchored: no\nLeaves: 8\n\nProofs in batch:\n- session_started (sha256:a1b2c3d4...)\n- analysis_heartbeat (sha256:e5f6a7b8...)\n- session_ended (sha256:c9d0e1f2...)",
          action: "GET_SESSION_PROOF_BATCH"
        }
      }
    ]
  ]
};

// src/index.ts
var openLessonPlugin = {
  name: "open-lesson",
  description: "openLesson v2 tutoring platform \u2014 learning plans, multimodal sessions, teaching assistant, cryptographic proofs, analytics, and API key management",
  actions: [
    // Key Management (4)
    listKeysAction,
    createKeyAction,
    revokeKeyAction,
    updateKeyScopesAction,
    // Learning Plans (8)
    listPlansAction,
    createPlanAction,
    getPlanAction,
    updatePlanAction,
    deletePlanAction,
    getPlanNodesAction,
    adaptPlanAction,
    createPlanFromVideoAction,
    // Sessions (11)
    listSessionsAction,
    startSessionAction,
    getSessionAction,
    analyzeHeartbeatAction,
    pauseSessionAction,
    resumeSessionAction,
    restartSessionAction,
    endSessionAction,
    getSessionProbesAction,
    getSessionPlanAction,
    getSessionTranscriptAction,
    // Teaching Assistant (2)
    askAssistantAction,
    getConversationHistoryAction,
    // Analytics (3)
    getUserAnalyticsAction,
    getSessionAnalyticsAction,
    getPlanAnalyticsAction,
    // Proofs (5)
    listProofsAction,
    getProofAction,
    verifyProofAction,
    anchorProofAction,
    getSessionProofBatchAction
  ],
  providers: [],
  services: [],
  evaluators: []
};
var index_default = openLessonPlugin;
export {
  adaptPlanAction,
  analyzeHeartbeatAction,
  anchorProofAction,
  askAssistantAction,
  createKeyAction,
  createPlanAction,
  createPlanFromVideoAction,
  index_default as default,
  deletePlanAction,
  endSessionAction,
  getConversationHistoryAction,
  getPlanAction,
  getPlanAnalyticsAction,
  getPlanNodesAction,
  getProofAction,
  getSessionAction,
  getSessionAnalyticsAction,
  getSessionPlanAction,
  getSessionProbesAction,
  getSessionProofBatchAction,
  getSessionTranscriptAction,
  getUserAnalyticsAction,
  listKeysAction,
  listPlansAction,
  listProofsAction,
  listSessionsAction,
  openLessonPlugin,
  pauseSessionAction,
  restartSessionAction,
  resumeSessionAction,
  revokeKeyAction,
  startSessionAction,
  updateKeyScopesAction,
  updatePlanAction,
  verifyProofAction
};
//# sourceMappingURL=index.js.map
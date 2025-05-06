import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { messageSchema } from "@shared/schema";
import OpenAI from "openai";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Load environment variables
dotenv.config();

// Log environment variable status (for debugging)
console.log("OPENAI_API_KEY defined:", !!process.env.OPENAI_API_KEY);

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERROR: OPENAI_API_KEY is not defined in environment variables");
}

const openai = new OpenAI({ 
  apiKey: apiKey
});

// Create memory object
const memory = {
  variables: {}
};

// Autobots API configuration
const AUTOBOTS_API_URL = "http://localhost:3004/api/v1/agents/white-clinic/chat";
const AUTOBOTS_TOKEN = process.env.DEV_TOKEN || "";
if (!process.env.DEV_TOKEN) {
  console.warn("WARNING: DEV_TOKEN is not defined in environment variables for Autobots API");
}

// Define shared conversation ID (since we're using in-memory storage with a single conversation)
const CONVERSATION_ID = 1;

// Define the todayInfo string with the dow, date, hour and minute
const todayInfo = `Today is ${new Date().toLocaleDateString('pt-PT', { weekday: 'long' })} of ${new Date().toLocaleDateString('pt-PT', { month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Lisbon' })}`;

// Define system prompt
const systemPrompt = `
  ## 1\. Persona e Objetivo

- **Identidade:**  
  Você é a assistente virtual da **White Clinic**, uma clínica dentária de prestígio. Você é especialista em agendamento de consultas. Seu tom de voz é simpático, prestativo e persuasivo. 

---

## 2\. Instruções Gerais para a Conversa

- **Objetivo Principal:**  
  Seu objetivo principal é garantir que o cliente que entre em contato com a clínica pela primeira vez pelo canal de whatsapp possa agendar um consulta na clínica

- **Sequência Lógica:**  
  A conversa deve seguir a ordem lógica apresentada abaixo, sem pular etapas.  
    
- **Perguntas Individuais:**  
  Sempre faça apenas uma pergunta por mensagem para não confundir o usuário.  
    
- **Tratamento de Erros:**  
  Se houver problemas, informe o usuário de forma educada e ofereça alternativas para concluir o agendamento.  
    
- **Encaminhamento para Ação:**  
  Sempre oriente o cliente para a próxima etapa com instruções claras e diretas.  
    
- **Tamanho das mensagens:**   
  - As mensagens de início da conversa, como boas vindas e apresentação, devem conter entre 30 e 50 palavras para estimular o potencial cliente a conversar.   
  - Em algumas partes da conversa que demandem resposta mais completas detalhadas como no caso de explicações sobre procedimentos e serviços que a clínica oferece você deve gerar respostas pode maiores entre 100 e 200 palavras com objetivo de priorizar a clareza integridade das informações fornecidas na resposta


- **Disponibilidade de datas:**  
  **Nunca** envie opções de datas que não estão disponíveis no tópicos informações de agenda. Se não houver informação de data disponível nas informações da agenda abaixo, diga que infelizmente não há horários disponível na data solicitada  
    
- **Persistência:**   
  - Você é um agente – por favor, continue até que a solicitação do usuário esteja completamente resolvida, antes de encerrar sua vez e passar de volta para o usuário.   
  - Só encerre sua vez quando tiver certeza de que o problema foi resolvido.

 

- **Planejamento:**  
  - Você **DEVE** planejar cuidadosamente antes de cada resposta. **NÃO** execute todo esse processo apenas considerando as informações disponíveis e estado da conversa. Avalie passo a passo se todos os requisitos da resposta foram atendidos baseado no contexto da conversa, instruções gerais, informações de dados situacionais e bases de conhecimentos disponíveis.

---

## 3\. Instruções para Conversas

### 1\. Boas-Vindas

- No início da conversa de boas vindas ao usuário com uma resposta do tipo:  
- Bem-vindo(a)\! Sou a assistente virtual da White Clinic. Posso ajudar a responder dúvidas sobre os nossos serviços, consultar as disponibilidades e realizar marcações para algumas consultas. Como posso ajudar hoje?

---

## 2\. Apresentação das Opções de Primeira Consulta

- **Explicação:**  
  Informe que, sendo a primeira consulta, existem diversas opções para melhor atender às necessidades.  
- **Tipos de Primeira Consulta:**  
  Apresente (sempre no idioma do usuário) as seguintes opções:  
  1. 1ª Consulta Dentária com o Dr. Miguel Stanley  
  2. 1ª Consulta Dentária com a Equipa Multidisciplinar  
  3. 1ª Consulta para Crianças  
  4. 1ª Consulta para Higiene Oral (HO)  
  5. 1ª Consulta para Medicina Regenerativa  
- **Orientação:**  
  - Pergunte qual das opções o usuário deseja agendar.  
  - Caso necessário, explique brevemente os benefícios ou características de cada tipo.

---

## 3\. Consulta dos Horários Disponíveis

- **Escolha da Data e Horário:**  
  	Pergunte qual data ou intervalo o usuário prefere.  
- **Informações de data atual:**  
  ${todayInfo}  
- **Se o cliente perguntar por datas sem o ano sempre considere datas no futuro por exemplo se hoje estamos em janeiro de 2025 e o cliente perguntar em fevereiro e omitir o ano sempre considere data no futuro em relação a data atual**  
- **Informações de Disponibilidade de Agenda:**

  $disponibilidade

- **Apresentação de Disponibilidade:**  
  - Acesse a agenda e mostre apenas os primeiros horários disponíveis da manhã e da tarde (um de cada) para os dias iniciais.  
  - **Importante:** Nunca exiba o nome dos médicos, apenas o dia e o horário.  
- **Situação sem disponibilidade:**  
  Se não houver horários disponíveis no dia solicitado nas informações da agenda:  
  - Informe ao usuário que, infelizmente, não há horário disponível para aquele dia.  
  - Pergunte qual outra data/horário pode ser adequado.  
- **Consulta especificada:**   
  - Caso a consulta seja já direcionada a um médico específico ou a uma primeira consulta, considere apenas essa opção ao buscar na agenda.

---

## 4\. Confirmação e Registo de Dados

- **Informações Solicitadas:**  
  Após o usuário escolher um horário, peça as seguintes informações, uma a uma:  
  1. Nome completo  
  2. Email  
  3. Data de nascimento  
  4. Nacionalidade  
  - Se a nacionalidade for de Portugal, peça também o NIF.  
- **Validação:**  
  - Valide o formato dos dados informados (e-mail, NIF, etc.).  
  - Se algum dado estiver incorreto, solicite novamente.  
- **Resumo e Confirmação Final:**  
  - Apresente um resumo do agendamento para o usuário.  
  - Peça a confirmação.  
  - Após a confirmação explícita, informe:  
      
    "A sua consulta foi agendada com sucesso\! A nossa equipa entrará em contacto brevemente por email, detalhando a consulta e as informações para o depósito inicial que garantirá a reserva da data e hora escolhidas."
  - Retorno da api sobre confirmação do agendamento
  $agendamento
---

## 5\. Regras e Observações Adicionais

- **Coerência e Ordem:**  
  Sempre siga a sequência lógica descrita, sem pular etapas ou combinar múltiplas perguntas na mesma mensagem.  
- **Flexibilidade e Empatia:**  
  Se o usuário demonstrar dúvidas, forneça informações detalhadas e reforce os benefícios dos serviços da clínica.

## 6\. Escalamento para Atendimento Humano

- **Regras de Escalamento:**  
  - Se a mensagem abaixo indicar que a conversa foi escalada para um humano, diga que a equipa entrará em contacto brevemente.
  $escalamento
  -

---

`;

// Initialize default conversation with system prompt
async function initializeConversation() {
  const existingConversation = await storage.getConversation(CONVERSATION_ID);
  
  if (!existingConversation) {
    const systemMessage = {
      role: "system",
      content: systemPrompt
    };
    
    await storage.createConversation({
      messages: [systemMessage],
      hasCheckpoint: false,
      checkpoint: [systemMessage]
    });
  }
}

// Define mockup function to check schedule availability
async function checkScheduleAvailability(date: string) {
  // TODO: Implement schedule availability check
  return "22/05/2025 at 14:00 is available";
}

// Define mockup function to escalate to human
async function escalateToHuman(reason: string) {
  // TODO: Implement escalation to human
  return "The conversation was escalated to human because " + reason;
}

// Define mockup function to book appointment
async function bookAppointment(date: string, name: string, email: string, birthDate: string, nationality: string, nif: string) {
  // TODO: Implement appointment booking
  return "Appointment booked successfully to " + name + " with email " + email + " and birth date " + birthDate + " and nationality " + nationality + " and nif " + nif;
}

// Define openai tool call
const tools = [
  {
    "type": "function",
    "name": "checkScheduleAvailability",
      "description": "Check the availability of a specific date",
      "parameters": {
        "type": "object",
        "properties": {
          "date": {
              "type": "string",
              "description": "The date to check availability for"
          },
        },
        "required": [
            "date"
        ],
        "additionalProperties": false
      }
  },
  {
    "type": "function",
    "name": "bookAppointment",
    "description": "Book an appointment for a specific date",
    "parameters": {
        "type": "object",
        "properties": {
          "date": {
              "type": "string",
              "description": "The date to book the appointment for"
          },
          "name": {
            "type": "string",
            "description": "The name of the patient or empty if not provided"
          },
          "email": {  
            "type": "string",
            "description": "The email of the patient or empty if not provided"
          },
          "birthDate": {
            "type": "string",
            "description": "The birth date of the patient or empty if not provided"
          },
          "nationality": {
            "type": "string",
            "description": "The nationality of the patient or empty if not provided"
          },
          "nif": {
            "type": "string",
            "description": "The NIF of the patient or empty if not provided"
          },
          "assistantSummary": {
            "type": "string",
            "description": "The assistant provided a summary of the appointment with all information given by the user and ask for confirmation"
          },
          "userConfirmation": {
            "type": "string",
            "description": "After the assistant provided the summary of all information and aks for confirmation, the user confirmed the summary provided by the assistant"
          }
        },
        "required": [
            "date",
            "name",
            "email",
            "birthDate",
            "nationality",
            "assistantSummary",
            "userConfirmation"
        ],
        "additionalProperties": false
      }
    }
];

// Define tools after the assitant response
const toolsAfterAssistantResponse = [
  {
    "type": "function",
    "name": "escalateToHuman",
    "description": "Escalate the conversation to a human if the user ask to talk to a human or the assistant says that equipa will contact the user later by email with the details of the intial depoist to ensure the appointment",
    "parameters": {
      "type": "object",
      "properties": {
        "reason": {
          "type": "string",
          "description": "The reason for escalation or empty if not identifyed"
        }
      },
      "required": [
        "reason"
      ],
      "additionalProperties": false
    }
  }
]

export async function registerRoutes(app: Express): Promise<Server> {

  // Initialize conversation
  await initializeConversation();
  
  // Get current conversation
  app.get("/api/conversation", async (req: Request, res: Response) => {
    const conversation = await storage.getConversation(CONVERSATION_ID);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Filter out system message for the UI
    const uiMessages = conversation.messages.filter(msg => msg.role !== "system");
    
    // Response with the conversation id, messages and hasCheckpoint
    res.json({
      id: conversation.id,
      messages: uiMessages,
      hasCheckpoint: conversation.hasCheckpoint
    });
  });
  
  // Get system prompt
  app.get("/api/system-prompt", async (req: Request, res: Response) => {
    const conversation = await storage.getConversation(CONVERSATION_ID);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Find the system message
    const systemMessage = conversation.messages.find(msg => msg.role === "system");
    
    if (!systemMessage) {
      return res.status(404).json({ message: "System prompt not found" });
    }
    
    // Return the system prompt
    res.json({ systemPrompt: systemMessage.content });
  });
  
  // Send message to OpenAI and get response
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      // Create a local schema for validating incoming messages from client
      const messageInputSchema = z.object({
        content: z.string().min(1)
      });
      
      const validatedData = messageInputSchema.parse(req.body);
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Define the function call data type
      interface FunctionCallData {
        type: string;
        name?: string;
        arguments?: string;
        result?: string;
        calls?: Array<{
          name: string;
          arguments: string;
          result?: string;
        }>;
      }
      
      // Add user message to conversation with extended type
      const userMessage: {
        role: "user";
        content: string;
        functionCallData?: FunctionCallData;
      } = {
        role: "user" as const,
        content: validatedData.content
      };
      
      const updatedMessages = [...conversation.messages, userMessage];

      // Sumarize message without system message
      const summary = updatedMessages.filter(msg => msg.role !== "system").map(msg => msg.content).join("\n");

      // Add today info to the summary
      const updatedSummary = `${todayInfo}\n${summary}`;
      
      // Call openai function
      const functionCall = await openai.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content: updatedSummary }],
        tools: tools as any // Type assertion to fix TS error
      });

      // Get the function output
      const functionOutput = functionCall.output;
      // console.log("functionCall", functionCall.output);

      // Initialize function call data to track what's happening
      let functionCallData: FunctionCallData = {
        type: "none",
        calls: []
      };

      // Variable to track if we have an escalation function call
      let hasEscalationCall = false;
      let escalationCallData: FunctionCallData | null = null;

      // Check the function output to process all function calls
      if (functionOutput.length > 0) {
        let hasFunctionCalls = false;
        
        // Loop through all function outputs
        for (const output of functionOutput) {
          if (output.type === "function_call") {
            hasFunctionCalls = true;
            const functionName = output.name;
            const functionParameters = output.arguments;
            
            // Store this function call
            const callData: {
              name: string;
              arguments: string;
              result?: string;
            } = {
              name: functionName,
              arguments: functionParameters
            };
            
            // Process each function call based on its name
            if (functionName === "checkScheduleAvailability") {
              const { date } = JSON.parse(functionParameters);
              const availability = await checkScheduleAvailability(date);
              // console.log("availability", availability);
              
              // Update function result
              callData.result = availability;
              
              // Replace system prompt available dates
              const updatedSystemPrompt = systemPrompt.replace("$disponibilidade", availability);
              updatedMessages[0].content = updatedSystemPrompt;
            }
            else if (functionName === "bookAppointment") {
              const { date, name, email, birthDate, nationality, nif, assistantSummary, userConfirmation } = JSON.parse(functionParameters);
              if (name !== "" && email !== "" && birthDate !== "" && nationality !== "" && assistantSummary && userConfirmation) {
                const appointment = await bookAppointment(date, name, email, birthDate, nationality, nif || "");
                // console.log("appointment", appointment);
                
                // Update function result
                callData.result = appointment;
                
                // Replace system prompt available dates
                const updatedSystemPrompt = systemPrompt.replace("$agendamento", appointment);
                updatedMessages[0].content = updatedSystemPrompt;
              }
            }
            
            // Add to the calls array
            if (!functionCallData.calls) functionCallData.calls = [];
            functionCallData.calls.push(callData);
          }
        }
        
        // Update the main function call data type if we had function calls
        if (hasFunctionCalls) {
          functionCallData.type = "function_call";
          
          // For backward compatibility, also store the first function call at the root level
          if (functionCallData.calls && functionCallData.calls.length > 0) {
            const firstCall = functionCallData.calls[0];
            functionCallData.name = firstCall.name;
            functionCallData.arguments = firstCall.arguments;
            functionCallData.result = firstCall.result;
          }
        } else {
          // No function calls, set default system prompt replacements
          let updatedSystemPrompt = systemPrompt.replace("$disponibilidade", "Sem disponibilidade de datas");
          updatedSystemPrompt = updatedSystemPrompt.replace("$agendamento", "Sem agendamento de consultas");
          updatedSystemPrompt = updatedSystemPrompt.replace("$escalamento", "");
          updatedMessages[0].content = updatedSystemPrompt;
        }
      } else {
        // No function output at all, set default system prompt replacements
        let updatedSystemPrompt = systemPrompt.replace("$disponibilidade", "Sem disponibilidade de datas");
        updatedSystemPrompt = updatedSystemPrompt.replace("$agendamento", "Sem agendamento de consultas");
        updatedSystemPrompt = updatedSystemPrompt.replace("$escalamento", "");
        updatedMessages[0].content = updatedSystemPrompt;
      }

      // Update the user message with function call data
      userMessage.functionCallData = functionCallData;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4.1", // Using gpt-4o which is a valid OpenAI model
        messages: updatedMessages
      });
      
      const assistantMessage: {
        role: "assistant";
        content: string;
        functionCallData?: FunctionCallData;
      } = {
        role: "assistant" as const,
        content: response.choices[0].message.content || "I'm sorry, I couldn't generate a response."
      };

      // Define the updated summary with the assistant message
      const updatedSummaryWithAssistantMessage = updatedSummary + "\n" + "Assistant: " + assistantMessage.content;
      // console.log("updatedSummaryWithAssistantMessage", updatedSummaryWithAssistantMessage);

      // Call openai function
      const functionCallAfterAssistantResponse = await openai.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content: updatedSummaryWithAssistantMessage }],
        tools: toolsAfterAssistantResponse as any // Type assertion to fix TS error
      });

      // Get the function output
      const functionOutputAfterAssistantResponse = functionCallAfterAssistantResponse.output;
      // console.log("functionCallAfterAssistantResponse", functionCallAfterAssistantResponse.output);

      // Reset escalation flags for assistant response processing
      hasEscalationCall = false;
      escalationCallData = null;

      if (functionOutputAfterAssistantResponse.length > 0) {
        for (const output of functionOutputAfterAssistantResponse) {
          if (output.type === "function_call") {
            const functionName = output.name;
            const functionParameters = output.arguments;
            
            if (functionName === "escalateToHuman") {
              const { reason } = JSON.parse(functionParameters);
              const escalation = await escalateToHuman(reason);
              // console.log("escalation", escalation);
              
              // Update system prompt with escalation info
              const updatedSystemPrompt = systemPrompt.replace("$escalamento", escalation);
              updatedMessages[0].content = updatedSystemPrompt;

              // Flag that we have an escalation call - this will be attached to the assistant message
              hasEscalationCall = true;
              
              // Create a separate function call data for the assistant
              escalationCallData = {
                type: "function_call",
                name: functionName,
                arguments: functionParameters,
                result: escalation,
                calls: [{
                  name: functionName,
                  arguments: functionParameters,
                  result: escalation
                }]
              };
            }
          }
        }
      }
      
      // If we had an escalation call, attach it to the assistant message
      if (hasEscalationCall && escalationCallData) {
        assistantMessage.functionCallData = escalationCallData;
      }
      
      // Save both messages to conversation
      const finalMessages = [...updatedMessages, assistantMessage];
      await storage.updateConversation(CONVERSATION_ID, finalMessages);
      
      res.status(200).json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Provide more specific error messages for OpenAI API errors
      if (error instanceof Error) {
        // Check if it's an OpenAI error with additional properties
        const openAIError = error as any;
        if (openAIError.code === 'invalid_api_key') {
          return res.status(500).json({
            message: "OpenAI API key is invalid or not properly configured",
            error: openAIError.message
          });
        }
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to process message" 
      });
    }
  });
  
  // Save checkpoint
  app.post("/api/checkpoint", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      await storage.saveCheckpoint(CONVERSATION_ID, conversation.messages);
      
      res.status(200).json({ success: true, message: "Checkpoint saved" });
    } catch (error) {
      console.error("Error saving checkpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save checkpoint" 
      });
    }
  });
  
  // Restore to checkpoint
  app.post("/api/checkpoint/restore", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (!conversation.hasCheckpoint) {
        return res.status(400).json({ message: "No checkpoint exists" });
      }
      
      await storage.updateConversation(CONVERSATION_ID, conversation.checkpoint);
      
      const uiMessages = conversation.checkpoint.filter(msg => msg.role !== "system");
      res.status(200).json({ 
        success: true, 
        message: "Checkpoint restored",
        messages: uiMessages
      });
    } catch (error) {
      console.error("Error restoring checkpoint:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to restore checkpoint" 
      });
    }
  });
  
  // Clear conversation
  app.post("/api/conversation/clear", async (req: Request, res: Response) => {
    try {
      await storage.clearConversation(CONVERSATION_ID);
      
      res.status(200).json({ success: true, message: "Conversation cleared" });
    } catch (error) {
      console.error("Error clearing conversation:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to clear conversation" 
      });
    }
  });
  
  // Send message to Autobots API
  app.post("/api/autobots/messages", async (req: Request, res: Response) => {
    try {
      // Create a local schema for validating incoming messages from client
      const messageInputSchema = z.object({
        content: z.string().min(1)
      });
      
      const validatedData = messageInputSchema.parse(req.body);
      const conversation = await storage.getConversation(CONVERSATION_ID);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Filter out system messages for the Autobots API
      const userMessages = conversation.messages
        .filter(msg => msg.role !== "system")
      
      // Add the new user message
      userMessages.push({
        role: "user" as const,
        content: validatedData.content
      });

      // Create request payload for Autobots API
      const autobotsPayload = {
        memory: {
          messages: userMessages,
          variables: memory.variables,
          contactData: {
            telefone: "558597496194" // Default test phone number
          }
        },
        identifier: "558597496194" // Default test identifier
      };

      // console.log("autobotsPayload", autobotsPayload.memory.messages);

      // Call Autobots API
      const autobotsResponse = await fetch(AUTOBOTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTOBOTS_TOKEN}`
        },
        body: JSON.stringify(autobotsPayload)
      });

      if (!autobotsResponse.ok) {
        const errorText = await autobotsResponse.text();
        throw new Error(`Autobots API error: ${autobotsResponse.status} - ${errorText}`);
      }
      const autobotsData = await autobotsResponse.json();

      //console.log("autobotsData", autobotsData.memory.messages);
      // console.log("Function call detection - message array length:", autobotsData.memory.messages.length);
      
      // if (autobotsData.memory.messages.length >= 3) {
      //   console.log("Third last message:", JSON.stringify(autobotsData.memory.messages[autobotsData.memory.messages.length - 3]));
      //   console.log("Second last message:", JSON.stringify(autobotsData.memory.messages[autobotsData.memory.messages.length - 2]));
      //   console.log("Last message:", JSON.stringify(autobotsData.memory.messages[autobotsData.memory.messages.length - 1]));
      // }
      
      // Create user and assistant messages
      const userMessage = {
        role: "user" as const,
        content: validatedData.content
      };

      // console.log("autobotsData.memory.messages", autobotsData.memory.messages);
      memory.variables = autobotsData.memory.variables;

      // Define the function call data type for Autobots API
      interface AutobotsFunctionCallData {
        type: string;
        name?: string;
        arguments?: string;
        result?: string;
        calls?: Array<{
          name: string;
          arguments: string;
          result?: string;
        }>;
      }

      // Define the tool calls and tool calls output
      let toolCalls = {
        name: "",
        type: "",
        arguments: "",
        output: ""
      };

      // Check for function calls in various patterns
      let hasFunctionCall = false;
      
      // Pattern 1: Check the last 3 messages (most common pattern)
      if (autobotsData.memory.messages.length >= 3) {
        // Find the most recent function_call and its output
        for (let i = autobotsData.memory.messages.length - 1; i >= 2; i--) {
          const currentMsg = autobotsData.memory.messages[i - 2];
          const nextMsg = autobotsData.memory.messages[i - 1];
          const assistantMsg = autobotsData.memory.messages[i];
          
          if (currentMsg && currentMsg.type === "function_call" && nextMsg && nextMsg.type === "function_call_output") {
            toolCalls.name = currentMsg.name || "";
            toolCalls.type = "function_call";
            toolCalls.arguments = currentMsg.arguments || "";
            toolCalls.output = nextMsg.output || "";
            hasFunctionCall = true;
            // console.log("Found function call pattern in messages:", i-2, i-1, i);
            break;
          }
        }
      }
      
      // Pattern 2: Direct function_call property on the last message (alternate pattern)
      if (!hasFunctionCall) {
        const lastMessage = autobotsData.memory.messages[autobotsData.memory.messages.length - 1];
        if (lastMessage && lastMessage.function_call) {
          toolCalls.name = lastMessage.function_call.name || "";
          toolCalls.type = "function_call";
          toolCalls.arguments = lastMessage.function_call.arguments || "";
          toolCalls.output = lastMessage.function_call.result || "";
          hasFunctionCall = true;
        }
      }
      
      // Pattern 3: Check if any message has function_call and manually find pairs
      if (!hasFunctionCall) {
        for (let i = 0; i < autobotsData.memory.messages.length - 1; i++) {
          const currentMsg = autobotsData.memory.messages[i];
          const nextMsg = autobotsData.memory.messages[i + 1];
          
          if (currentMsg && currentMsg.function_call) {
            toolCalls.name = currentMsg.function_call.name || "";
            toolCalls.type = "function_call";
            toolCalls.arguments = currentMsg.function_call.arguments || "";
            // Assume the next message might contain the result
            if (nextMsg && nextMsg.role === "function") {
              toolCalls.output = nextMsg.content || "";
            }
            hasFunctionCall = true;
            break;
          }
        }
      }

      // console.log("Final toolCalls object:", JSON.stringify(toolCalls));
      // console.log("Has function call:", hasFunctionCall);

      // Define the assistant message
      const assistantMessage: {
        role: "assistant";
        content: string;
        functionCallData?: AutobotsFunctionCallData;
      } = {
        role: "assistant" as const,
        content: autobotsData.memory.messages[autobotsData.memory.messages.length - 1].content || "I'm sorry, I couldn't generate a response."
      };
      
      // Add function call data to assistant message if it exists
      if (hasFunctionCall && toolCalls.name) {
        assistantMessage.functionCallData = {
          type: "function_call",
          name: toolCalls.name,
          arguments: toolCalls.arguments,
          result: toolCalls.output || "",
          calls: [{
            name: toolCalls.name,
            arguments: toolCalls.arguments,
            result: toolCalls.output || ""
          }]
        };
        
        // Log the function call data being attached to the assistant message
        // console.log("Function call data attached:", {
        //   name: toolCalls.name,
        //   arguments: toolCalls.arguments,
        //   output: toolCalls.output
        // });
      }
      
      // Save both messages to conversation
      let finalMessages = autobotsData.memory.messages;
      
      // Filter out messages with undefined roles or system-only message types
      finalMessages = finalMessages.filter((msg: any) => {
        // Keep only messages with a valid role (user or assistant)
        if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
          return false;
        }
        
        // Filter out any system or function messages without content
        if (!msg.content && msg.role === 'system') {
          return false;
        }
        
        return true;
      });
      
      // console.log("Filtered messages:", finalMessages.length);
      
      // Find the last message (which should be the assistant's response)
      // and update it with function call data if it exists
      if (finalMessages.length > 0 && assistantMessage.functionCallData) {
        const lastMessageIndex = finalMessages.length - 1;
        if (finalMessages[lastMessageIndex].role === 'assistant') {
          finalMessages[lastMessageIndex].functionCallData = assistantMessage.functionCallData;
        } else {
          // Find the most recent assistant message
          for (let i = finalMessages.length - 1; i >= 0; i--) {
            if (finalMessages[i].role === 'assistant') {
              finalMessages[i].functionCallData = assistantMessage.functionCallData;
              break;
            }
          }
        }
      }
      
      // Log the final messages to see the structure
      // console.log("Final messages with functionCallData:", 
      //   finalMessages.map((msg: any) => ({
      //     role: msg.role,
      //     hasFunctionCallData: !!msg.functionCallData
      //   }))
      // );
      
      await storage.updateConversation(CONVERSATION_ID, finalMessages);
      
      // Log the response being sent to the client
      // console.log("Response object sent to client:", {
      //   userMessage: {
      //     role: userMessage.role,
      //     content: userMessage.content
      //   },
      //   assistantMessage: {
      //     role: assistantMessage.role,
      //     content: assistantMessage.content,
      //     hasFunctionCallData: assistantMessage.functionCallData ? true : false,
      //     functionCallData: assistantMessage.functionCallData
      //   }
      // });
      
      res.status(200).json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Error processing message with Autobots API:", error);
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to process message with Autobots API" 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}

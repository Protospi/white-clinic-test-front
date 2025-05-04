import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { messageSchema } from "@shared/schema";
import OpenAI from "openai";
import dotenv from "dotenv";

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
            "type": "boolean",
            "description": "The summary of the appointment with all infromation was provided by the assistant? true or false if not provided"
          },
          "userConfirmation": {
            "type": "boolean",
            "description": "The user confirmed the appointment summary provided by the assistant? true or false if not explicity confirmed"
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
        model: "gpt-4o",
        input: [{ role: "user", content: updatedSummary }],
        tools: tools as any // Type assertion to fix TS error
      });

      // Get the function output
      const functionOutput = functionCall.output;
      console.log("functionCall", functionCall.output);

      // Initialize function call data to track what's happening
      let functionCallData: FunctionCallData = {
        type: "none",
        calls: []
      };

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
              console.log("availability", availability);
              
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
                console.log("appointment", appointment);
                
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
          updatedMessages[0].content = updatedSystemPrompt;
        }
      } else {
        // No function output at all, set default system prompt replacements
        let updatedSystemPrompt = systemPrompt.replace("$disponibilidade", "Sem disponibilidade de datas");
        updatedSystemPrompt = updatedSystemPrompt.replace("$agendamento", "Sem agendamento de consultas");
        updatedMessages[0].content = updatedSystemPrompt;
      }

      // Update the user message with function call data
      userMessage.functionCallData = functionCallData;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which is a valid OpenAI model
        messages: updatedMessages
      });
      
      const assistantMessage = {
        role: "assistant" as const,
        content: response.choices[0].message.content || "I'm sorry, I couldn't generate a response."
      };
      
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
  
  const httpServer = createServer(app);
  return httpServer;
}

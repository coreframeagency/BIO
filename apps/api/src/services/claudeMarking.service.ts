import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HaikuMarkingResult {
  marksAwarded: number;
  feedback: string;
  isCorrect: boolean;
}

export async function markShortAnswerWithHaiku(
  questionText: string,
  modelAnswer: string,
  markScheme: string,
  studentAnswer: string,
  marks: number
): Promise<HaikuMarkingResult> {
  const prompt = `You are marking a GCSE exam question.
Question: ${questionText}
Model Answer: ${modelAnswer}
Mark Scheme: ${markScheme}
Student Answer: ${studentAnswer}
Maximum marks: ${marks}

Award marks strictly based on the mark scheme.
Respond in JSON only: { "marksAwarded": number, "feedback": string, "isCorrect": boolean }
feedback should be 1-2 sentences explaining what was correct/incorrect.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as HaikuMarkingResult;
  return {
    marksAwarded: Math.min(Math.max(0, parsed.marksAwarded ?? 0), marks),
    feedback: parsed.feedback ?? 'Answer reviewed.',
    isCorrect: parsed.isCorrect ?? (parsed.marksAwarded === marks),
  };
}

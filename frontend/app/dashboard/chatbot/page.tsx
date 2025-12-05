import Chatbot from '@/components/Chatbot';

export default function ChatbotPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Health Assistant</h1>
      <p className="text-sm text-gray-600 mb-4">Get personalized health recommendations and tailored advice from your AI assistant.</p>
      <div className="max-w-3xl">
        <Chatbot />
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Chatbot({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
useEffect(() => {
  const showWelcomeMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/chatbot/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

let name = user?.full_name || user?.name || user?.username;
let welcomeText = name
  ? `Hello ${name}! I'm your HR assistant. I can help you with payroll-related queries, salary information and general HR questions.  
How can I assist you today?`
  : `Hello! I'm your HR assistant. I can help you with payroll-related queries, salary information and general HR questions.  
How can I assist you today?`;


      if (Array.isArray(res.data)) {
        const formattedMessages = res.data.flatMap(chat => [
          { role: 'user', content: chat.user_message },
          ...(chat.bot_reply ? [{ role: 'bot', content: chat.bot_reply }] : [])
        ]);

        setMessages([{ role: 'bot', content: welcomeText }, ...formattedMessages]);
      } else {
        setMessages([{ role: 'bot', content: welcomeText }]);
      }
    } catch (err) {
      console.error('Error loading chat + welcome message:', err);
    }
  };

  showWelcomeMessage();
}, [user]);


useEffect(() => {
  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/chatbot/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Chat history response:', res.data);

      if (Array.isArray(res.data)) {
        const formattedMessages = res.data.flatMap(chat => [
          { role: 'user', content: chat.user_message },
          ...(chat.bot_reply
            ? [{ role: 'bot', content: chat.bot_reply }]
            : [])
        ]);
        setMessages(formattedMessages);
      } else {
        console.warn('Unexpected response format:', res.data);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  fetchChatHistory();
}, []);




  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/chatbot`, {
        message: userMessage,
        session_id: sessionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      toast.error('Failed to get response from chatbot');
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto" data-testid="chatbot-page">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">HR Chatbot Assistant</h1>
          <p className="text-gray-600">Ask questions about payroll, salaries and HR policies</p>
        </div>

        <Card className="border-0 shadow-2xl h-[calc(100vh-16rem)]">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center text-xl">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
              Chat with HR Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </div>
<div
  className={`px-4 py-3 rounded-2xl overflow-auto max-h-96 ${
    message.role === 'user'
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
  }`}
>
  <div
    className={`prose max-w-none ${
      message.role === 'user'
        ? 'prose-invert'
        : 'prose-blue prose-headings:text-blue-800 prose-strong:text-gray-900'
    } prose-sm md:prose-base prose-headings:font-semibold prose-li:marker:text-blue-600 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded-lg prose-table:border prose-table:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:p-2`}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
    >
      {message.content}
    </ReactMarkdown>
  </div>
</div>

                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-gray-100">
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-gray-50">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                  data-testid="chatbot-input"
                />
                <Button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  data-testid="chatbot-send-button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
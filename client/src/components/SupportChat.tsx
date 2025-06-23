
import React, { useState } from 'react';
import { MessageCircle, X, Send, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Bonjour! Je suis Claude, votre assistant IA. Je peux vous aider avec MediaSync pour télécharger des vidéos et de l\'audio depuis différentes plateformes. Comment puis-je vous aider?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const commonQuestions = [
    'Comment télécharger depuis YouTube?',
    'Quels formats sont supportés?',
    'Problème de téléchargement Instagram',
    'Options de qualité vidéo',
    'Erreur de téléchargement TikTok',
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      text: 'Claude tape...',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationHistory: messages.filter(m => m.id !== 'typing').slice(-10) // Last 10 messages for context
        }),
      });

      const data = await response.json();

      // Remove typing indicator and add response
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.id !== 'typing');
        return [...withoutTyping, {
          id: (Date.now() + 1).toString(),
          text: data.response || data.fallback || 'Désolé, je ne peux pas répondre en ce moment.',
          isUser: false,
          timestamp: new Date(),
        }];
      });

    } catch (error) {
      console.error('Chat error:', error);
      // Remove typing indicator and add error message
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.id !== 'typing');
        return [...withoutTyping, {
          id: (Date.now() + 1).toString(),
          text: 'Désolé, il y a eu un problème avec le service de chat. Pour les problèmes de téléchargement, vérifiez que votre URL est correcte et que la vidéo est publique.',
          isUser: false,
          timestamp: new Date(),
        }];
      });
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg animate-pulse-glow"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 animate-slide-up">
          <Card className="glassmorphism border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="w-5 h-5" />
                Chat avec Claude AI
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto space-y-3 pr-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Questions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Questions rapides:</p>
                <div className="flex flex-wrap gap-1">
                  {commonQuestions.map((question) => (
                    <Badge
                      key={question}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => handleQuestionClick(question)}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default SupportChat;

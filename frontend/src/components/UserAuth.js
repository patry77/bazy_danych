import React, { useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';

const AuthContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
`;

const AuthCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 400px;
  width: 100%;
`;

const AuthTitle = styled.h2`
  text-align: center;
  color: #667eea;
  margin-bottom: 30px;
  font-size: 2rem;
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #333;
`;

const Input = styled.input`
  padding: 15px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const AuthButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const UserAuth = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
      if (!username.trim()) {
      toast.error('Proszę podać nazwę użytkownika');
      return;
    }
    
    if (username.length < 2) {
      toast.error('Nazwa użytkownika musi mieć co najmniej 2 znaki');
      return;
    }
    
    setLoading(true);
    
    try {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userData = {
        id: userId,
        username: username.trim(),        joinedAt: Date.now()
      };

      await fetch('/api/chat/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionData: userData })
      });
      
      onLogin(userData);
      toast.success(`Witaj, ${userData.username}!`);
      
    } catch (error) {
      toast.error('Logowanie nie powiodło się. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (    <AuthContainer>
      <AuthCard>
        <AuthTitle>Dołącz do Redis Chat</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          <InputGroup>
            <Label>Wybierz swoją nazwę użytkownika:</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Podaj nazwę użytkownika..."
              maxLength={20}
              disabled={loading}
              autoFocus
            />
          </InputGroup>
          
          <AuthButton type="submit" disabled={loading || !username.trim()}>
            {loading ? 'Dołączanie...' : 'Dołącz do czatu'}
          </AuthButton>
        </AuthForm>
      </AuthCard>
    </AuthContainer>
  );
};

export default UserAuth;

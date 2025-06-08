import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import components properly
import ChatRoom from './components/ChatRoom';
import RoomList from './components/RoomList';
import UserAuth from './components/UserAuth';
import RedisDemo from './components/RedisDemo';
import CacheDemo from './components/CacheDemo';
import Navigation from './components/Navigation';


// Services
import { connectSocket, disconnectSocket } from './services/socketService';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const MainContent = styled.div`
  padding-top: 80px;
  min-height: calc(100vh - 80px);
`;

const WelcomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 160px);
  text-align: center;
  color: white;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  opacity: 0.9;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 2rem 0;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 10px;
  color: #fff;
`;

const FeatureDescription = styled.p`
  opacity: 0.8;
  line-height: 1.6;
`;

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('chatUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentRoom, setCurrentRoom] = useState(null);

  useEffect(() => {
    if (user) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentRoom(null);
    localStorage.removeItem('chatUser');
    disconnectSocket();
  };

  const handleJoinRoom = (room) => {
    setCurrentRoom(room);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <Router>
      <AppContainer>
        <Navigation 
          user={user} 
          onLogout={handleLogout}
          currentRoom={currentRoom}
          onLeaveRoom={handleLeaveRoom}
        />
        
        <MainContent>
          <Routes>
            <Route path="/" element={
              !user ? (
                <UserAuth onLogin={handleLogin} />
              ) : currentRoom ? (
                <ChatRoom 
                  user={user} 
                  room={currentRoom} 
                  onLeaveRoom={handleLeaveRoom}
                />
              ) : (
                <RoomList 
                  user={user} 
                  onJoinRoom={handleJoinRoom}
                />
              )
            } />
          
            
            <Route path="/redis" element={
              user ? <RedisDemo /> : <Navigate to="/" />
            } />
            
            <Route path="/cache" element={
              user ? <CacheDemo /> : <Navigate to="/" />
            } />
          </Routes>
        </MainContent>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AppContainer>
    </Router>
  );
}


export default App;
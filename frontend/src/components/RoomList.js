import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import toast from 'react-hot-toast';
import { fetchLeaderboard } from '../services/socketService';

const RoomListContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const RoomListTitle = styled.h1`
  color: white;
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const CreateRoomCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
`;

const CreateRoomTitle = styled.h3`
  color: #667eea;
  margin-bottom: 20px;
`;

const CreateRoomForm = styled.form`
  display: flex;
  gap: 15px;
  align-items: end;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const RoomsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
`;

const RoomCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-5px);
    border-color: #667eea;
    box-shadow: 0 15px 35px rgba(0,0,0,0.15);
  }
`;

const RoomName = styled.h3`
  color: #333;
  margin-bottom: 10px;
  font-size: 1.3rem;
`;

const RoomStats = styled.div`
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 15px;
`;

const RoomDescription = styled.p`
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
`;

const JoinButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
  
  &:hover {
    transform: translateY(-1px);
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RoomList = ({ user, onJoinRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetchRooms();
    // Set up interval to auto-refresh room list every 5 seconds
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch leaderboard on mount and every 10s
    const getLeaderboard = async () => {
      try {
        const data = await fetchLeaderboard(10);
        setLeaderboard(data);
      } catch {}
    };
    getLeaderboard();
    const interval = setInterval(getLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/chat/rooms');
      setRooms(response.data.data);
    } catch (error) {
      // Fallback with default rooms if API fails
      setRooms([
        { id: 'general', name: 'General', userCount: 0, messageCount: 0 },
        { id: 'random', name: 'Random', userCount: 0, messageCount: 0 }
      ]);
      toast.error('Failed to load rooms from server, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    setCreating(true);
    try {
      const roomId = newRoomName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      // Send correct payload to backend
      const newRoomPayload = {
        roomId,
        name: newRoomName.trim(),
        createdBy: user.id
      };
      try {
        const response = await axios.post('/api/chat/rooms', newRoomPayload);
        await fetchRooms();
      } catch (apiError) {
        // Fallback - add locally
        setRooms(prev => [...prev, { id: roomId, name: newRoomName.trim(), userCount: 0, messageCount: 0, createdBy: user.id }]);
      }
      setNewRoomName('');
      toast.success('Stworzono pokój: ' + newRoomName.trim());
    } catch (error) {
      toast.error('Nie udało się stworzyć pokoju. Spróbuj ponownie.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (room) => {
    onJoinRoom(room);
    toast.success(`Dołączam do ${room.name}...`);
  };

  if (loading) {
    return (
      <RoomListContainer>
        <RoomListTitle>Ładuje pokoje</RoomListTitle>
      </RoomListContainer>
    );
  }

  return (
    <RoomListContainer>
      <RoomListTitle>Wybierz pokój</RoomListTitle>
      
      {/* Leaderboard display */}
      <div style={{background:'#fff',borderRadius:10,padding:20,marginBottom:30,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
        <h2 style={{color:'#667eea',marginBottom:10,fontSize:'1.3rem'}}>🏆 Ranking aktywności</h2>
        <ol style={{margin:0,paddingLeft:20}}>
          {leaderboard.map((entry,i) => (
            <li key={entry.userId} style={{marginBottom:4}}>
              <span style={{fontWeight:600}}>{entry.username}</span> <span style={{color:'#888'}}>({entry.score})</span>
            </li>
          ))}
        </ol>
      </div>

      <CreateRoomCard>
        <CreateRoomTitle>Stwórz nowy pokój</CreateRoomTitle>
        <CreateRoomForm onSubmit={handleCreateRoom}>
          <Input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Nazwa pokoju..."
            maxLength={30}
            disabled={creating}
          />
          <Button type="submit" disabled={creating || !newRoomName.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </CreateRoomForm>
      </CreateRoomCard>

      <RoomsGrid>
        {rooms.map((room) => (
          <RoomCard key={room.id} onClick={() => handleJoinRoom(room)}>
            <RoomName>#{room.name}</RoomName>
            <RoomStats>
              {/* Usunięto licznik użytkowników */}
              <span>💬 {room.messageCount || 0} messages</span>
            </RoomStats>
            <RoomDescription>
              {room.id === 'general' && 'xx'}
              {room.id === 'random' && 'xx'}
              {!['general', 'random'].includes(room.id) && 'xx'}
            </RoomDescription>
            <JoinButton>
              Dołącz
            </JoinButton>
          </RoomCard>
        ))}
      </RoomsGrid>
      
      {rooms.length === 0 && (
        <div style={{ textAlign: 'center', color: 'white', marginTop: '40px' }}>
          <h3>Brak pokojów</h3>
        </div>
      )}
    </RoomListContainer>
  );
};

export default RoomList;
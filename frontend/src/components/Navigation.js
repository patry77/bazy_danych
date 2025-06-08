// ===== frontend/src/components/Navigation.js =====
import React from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0 20px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 30px;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover, &.active {
    background: #667eea;
    color: white;
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  
  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
    font-size: 0.9rem;
  }
`;

const UserName = styled.span`
  @media (max-width: 768px) {
    display: none;
  }
`;

const Button = styled.button`
  background: ${props => props.variant === 'danger' ? '#ff6b6b' : '#667eea'};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.variant === 'danger' ? '#ff5252' : '#5a67d8'};
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
`;

const Navigation = ({ user, onLogout, currentRoom, onLeaveRoom }) => {
  const location = useLocation();
  
  if (!user) return null;
  
  return (
    <NavContainer>
      <Logo>
        💬 Redis Chat
        {currentRoom && <span> - #{currentRoom.name}</span>}
      </Logo>
      
      <NavLinks>
        <NavLink 
          to="/" 
          className={location.pathname === '/' ? 'active' : ''}
        >
          {currentRoom ? 'Chat' : 'Rooms'}
        </NavLink>
        <NavLink 
          to="/redis" 
          className={location.pathname === '/redis' ? 'active' : ''}
        >
          Redis
        </NavLink>
        <NavLink 
          to="/cache" 
          className={location.pathname === '/cache' ? 'active' : ''}
        >
          Cache
        </NavLink>
      </NavLinks>
      
      <UserInfo>
        <UserAvatar>
          {user.username.charAt(0).toUpperCase()}
        </UserAvatar>
        <UserName>{user.username}</UserName>
        {currentRoom && (
          <Button onClick={onLeaveRoom}>
            Opuść pokój
          </Button>
        )}
        <Button variant="danger" onClick={onLogout}>
          Wyloguj
        </Button>
      </UserInfo>
    </NavContainer>
  );
};

export default Navigation;
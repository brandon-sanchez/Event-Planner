import Header from '../components/Header/Header';
import Calendar from '../components/Calendar/Calendar';
import { db } from '../config/firebase';
import { collection, where, onSnapshot, query } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { getCurrentUserId } from '../utils/Utils';

function Dashboard() {
  //state for invitations
  const [invitations, setInvitations] = useState([]);
  
  useEffect(() => {
    try {
      const userId = getCurrentUserId();

      const invitationRef = collection(db, 'users', userId, 'invitations');

      const q = query(invitationRef, where('status', '==', 'pending'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const invitationsData = [];

        querySnapshot.forEach((doc) => {
          invitationsData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setInvitations(invitationsData);
      }, (error) => {
        console.log('Error fetching invitations in real-time:', error);
      });
      
      //unsubscribe when component unmounts
      return () => unsubscribe();
    } catch (error) {
      console.log('Error setting up invitations listener:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Header
        invitations={invitations}
      />
      <main className="container mx-auto px-6 py-8">
        <Calendar />
      </main>
    </div>
  );
}

export default Dashboard;
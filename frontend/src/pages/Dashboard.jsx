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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(244,63,94,0.12),transparent_25%)] pointer-events-none" />
      <div className="relative">
        <Header invitations={invitations} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl shadow-black/40 p-4 sm:p-6">
            <Calendar />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

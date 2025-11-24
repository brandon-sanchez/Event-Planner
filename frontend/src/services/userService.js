import { collection, where, getDocs, setDoc, doc, getDoc, serverTimestamp, query} from 'firebase/firestore';
import { db } from '../config/firebase';
import { checkAuth } from '../utils/Utils';

const createOrUpdateUserProfile = async (userData) => {
  try {
    const user = checkAuth();

    const userDocRef = doc(db, 'users', user.uid);

    // prepare profile data that will be stored/updated
    const profileData = {
      email: userData.email || user.email,
      displayName: userData.displayName || userData.name || user.displayName || user.email?.split('@')[0],
      photoURL: userData.photoURL || userData.photoUrl || user.photoURL || null,
      updatedAt: serverTimestamp()
    };

    //check if profile already exists
    const userDoc = await getDoc(userDocRef);


    if (!userDoc.exists()) {
      //create new profile
      await setDoc(userDocRef, {
        ...profileData,
        createdAt: serverTimestamp()
      });
      console.log('User profile created successfully for user:', user.uid);
    } else {
      //update existing profile
      await setDoc(userDocRef, profileData, { merge: true });
      console.log('User profile updated successfully for user:', user.uid);
    }

    return { id: user.uid, ...profileData };
  } catch (error) {
    console.log('Error creating/updating user profile:', error);
    throw error;
  }
};

const getUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }

    return null;
  } catch (error) {
    console.log('Error fetching user profile:', error);
    throw error;
  }
};

const findUserByEmail = async (email) => {
  try {
    checkAuth();

    const usersRef = collection(db, 'users');

    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));

    //execute query to find user by email
    const querySnapshot = await getDocs(q);

    if(!querySnapshot.empty) {
      //get first matching document since emails are unique
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }

    //no user found
    return null;
  } catch (error) {
    console.log('Error finding user by email:', error);
    throw error;
  }
};

const findUserByEmails = async (emails) => {
  try {
    checkAuth();

    const foundUsers = [];
    const notFoundEmails = [];

    //process each email individually
    for (const email of emails) {
      const user = await findUserByEmail(email);

      if (user) {
        foundUsers.push(user);
      } else {
        notFoundEmails.push(email);
      }
    }
    return { foundUsers, notFoundEmails };
  } catch (error) {
    console.log('Error finding users by emails:', error);
    throw error;
  }
}


export { createOrUpdateUserProfile , getUserProfile, findUserByEmail, findUserByEmails };

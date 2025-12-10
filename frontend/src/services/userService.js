import { collection, where, getDocs, setDoc, doc, getDoc, serverTimestamp, query} from 'firebase/firestore';
import { db } from '../config/firebase';
import { checkAuth } from '../utils/Utils';

const createOrUpdateUserProfile = async (userData) => {
  try {
    const user = checkAuth();

    const userDocRef = doc(db, 'users', user.uid);

    // prepare profile data that will be stored/updated
    const displayName = userData.displayName || userData.name || user.displayName || user.email?.split('@')[0];
    const email = userData.email || user.email;

    const profileData = {
      email: email,
      displayName: displayName,
      photoURL: userData.photoURL || userData.photoUrl || user.photoURL || null,
      emailLowercase: email?.toLowerCase() || '',
      displayNameLowercase: displayName?.toLowerCase() || '',
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

const searchUsers = async(searchQuery) => {
  try {
    checkAuth();

    const q = searchQuery.toLowerCase().trim();

    //if query is empty return empty list
    if(!q) {
      return [];
    }

    const usersRef = collection(db, 'users');

    const emailQuery = query(
      usersRef,
      where('emailLowercase', '>=', q),
      where('emailLowercase', '<=', q + '\uf8ff')
    );

    const nameQuery = query(
      usersRef,
      where('displayNameLowercase', '>=', q),
      where('displayNameLowercase', '<=', q + '\uf8ff')
    );

    //executing both queries and wait for all to complete
    const [emailSnapshot, nameSnapshot] = await Promise.all([
      getDocs(emailQuery),
      getDocs(nameQuery)
    ]);

    //combine the results without duplicates
    const emailResults = emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nameResults = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const seenIds = new Set();
    const combinedResults = [];

    //for each processed result add if not already seen
    [...emailResults, ...nameResults].forEach(user => {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        combinedResults.push(user);
      }
    });
    

    //returning top 5 results
    return combinedResults.slice(0, 5);
  } catch (error) {
    console.log('Error searching users:', error);

    //on error return just an empty list
    return []
  }
};


export { createOrUpdateUserProfile , getUserProfile, findUserByEmail, searchUsers};

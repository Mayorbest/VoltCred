import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyBjlCkS54cw2C2L0K3k73IRaIxlg4TNDXY",
  authDomain: "voltcred-5d532.firebaseapp.com",
  databaseURL: "https://voltcred-5d532-default-rtdb.firebaseio.com",
  projectId: "voltcred-5d532",
  storageBucket:  "voltcred-5d532.firebasestorage.app",
  messagingSenderId: "269263948415",
  appId: "1:269263948415:web:ec844cb6a31ee575b08d4a",
   measurementId: "G-VGLGYK3MXM",
   databaseURL: "https://voltcred-5d532-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Helper function to listen to live data
export function listenToNode(path, callback) {
    const dataRef = ref(db, path);
    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
}

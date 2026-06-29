// أزما | إعدادات الاتصال بـ Firebase
// قم باستبدال القيم أدناه بمفاتيح مشروعك الحقيقية من لوحة تحكم Firebase (Firebase Console)

const firebaseConfig = {
  apiKey: "AIzaSyFakeKey-Placeholder123456789",
  authDomain: "azma-design.firebaseapp.com",
  projectId: "azma-design",
  storageBucket: "azma-design.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

// تهيئة Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// تصدير الكائنات العامة للاستخدام في ملف index.html الرئيسي
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

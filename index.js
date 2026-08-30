// قائمة الحسابات وكلمات المرور الافتراضية
const DEFAULT_ACCOUNTS = {
  "admin": { name: "المالك (الوالد)", pass: "1234" },
  "morning_staff": { name: "موظف الصباح", pass: "1111" },
  "evening_staff": { name: "موظف المساء", pass: "2222" }
};

// تهيئة كلمات المرور في التخزين المحلي عند التشغيل لأول مرة
function initUserCredentials() {
  if (!localStorage.getItem('user_credentials')) {
    localStorage.setItem('user_credentials', JSON.stringify(DEFAULT_ACCOUNTS));
  }
}
initUserCredentials();

// الحصول على الحساب المسجل حالياً (مع قيمة احتياطية)
function getCurrentUserKey() {
  return localStorage.getItem('current_user_key') || 'morning_staff';
}

// فتح النافذة المنبثقة
function openChangePasswordModal() {
  const currentKey = getCurrentUserKey();
  const credentials = JSON.parse(localStorage.getItem('user_credentials')) || DEFAULT_ACCOUNTS;
  const currentUser = credentials[currentKey] || { name: currentKey };

  document.getElementById('displayCurrentUsername').innerText = currentUser.name || currentKey;
  
  // إعادة تعيين الحقول ورسائل الخطأ
  document.getElementById('changePasswordForm').reset();
  const msgBox = document.getElementById('changePassMessage');
  msgBox.style.display = 'none';

  const modal = document.getElementById('changePasswordModal');
  modal.style.display = 'flex';
}

// إغلاق النافذة المنبثقة
function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none';
}

// معالجة تغيير كلمة المرور
function handlePasswordChange(event) {
  event.preventDefault();

  const oldPass = document.getElementById('oldPassInput').value.trim();
  const newPass = document.getElementById('newPassInput').value.trim();
  const confirmPass = document.getElementById('confirmPassInput').value.trim();
  const msgBox = document.getElementById('changePassMessage');

  const currentKey = getCurrentUserKey();
  const credentials = JSON.parse(localStorage.getItem('user_credentials')) || DEFAULT_ACCOUNTS;

  // 1. التحقق من كلمة المرور الحالية
  if (!credentials[currentKey] || credentials[currentKey].pass !== oldPass) {
    showFeedback("كلمة المرور الحالية غير صحيحة!", "#dc2626");
    return;
  }

  // 2. التحقق من تطابق الكلمة الجديدة
  if (newPass !== confirmPass) {
    showFeedback("كلمة المرور الجديدة وتأكيدها غير متطابقين!", "#dc2626");
    return;
  }

  // 3. التحقق من قوة/طول كلمة المرور
  if (newPass.length < 4) {
    showFeedback("يجب أن تتكون كلمة المرور من 4 رموز على الأقل.", "#dc2626");
    return;
  }

  // 4. حفظ كلمة المرور الجديدة
  credentials[currentKey].pass = newPass;
  localStorage.setItem('user_credentials', JSON.stringify(credentials));

  showFeedback("تم تحديث كلمة المرور بنجاح!", "#16a34a");

  // إغلاق النافذة بعد ثانية واحدة
  setTimeout(() => {
    closeChangePasswordModal();
  }, 1000);
}

function showFeedback(text, color) {
  const msgBox = document.getElementById('changePassMessage');
  msgBox.innerText = text;
  msgBox.style.color = color;
  msgBox.style.display = 'block';
}

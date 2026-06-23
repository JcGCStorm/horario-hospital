export class Model {
  constructor() {
    this.FIREBASE_CONFIG = {
      apiKey:            "AIzaSyBTW_NUstyCF89T5DsGhAjepRsG9fzicyY",
      authDomain:        "horarios-hospital-38017.firebaseapp.com",
      databaseURL:       "https://horarios-hospital-38017-default-rtdb.firebaseio.com",
      projectId:         "horarios-hospital-38017",
      storageBucket:     "horarios-hospital-38017.firebasestorage.app",
      messagingSenderId: "204891141094",
      appId:             "1:204891141094:web:cd50462967029fcb2b5c27"
    };

    this.DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    this.PALETTE = [
      { bg: '#162416', acc: '#50FA7B' }, // verde
      { bg: '#2D2319', acc: '#FFB86C' }, // naranja
      { bg: '#1B3048', acc: '#8BE9FD' }, // azul
      { bg: '#2E1A30', acc: '#FF79C6' }, // rosa
      { bg: '#1B1B3A', acc: '#BD93F9' }, // morado
      { bg: '#3A1B1B', acc: '#FF5555' }, // rojo
      { bg: '#2A2A2A', acc: '#F1FA8C' }  // amarillo
    ];

    this.SHIFTS = [
      { id:'noc', label:'Nocturno',   hours:'12:00 – 12:20' },
      { id:'noc2',label:'Nocturno',   hours:'06:00 – 06:20' },
      { id:'mat', label:'Matutino',   hours:'11:00 – 11:20' },
      { id:'ves', label:'Vespertino', hours:'18:00 – 18:20' },
    ];

    this.notesCategories = [
      { id: 'cat_1', title: '🏥 Datos Clínicos y Condición', content: '' },
      { id: 'cat_2', title: '📅 Fechas Importantes', content: '' },
      { id: 'cat_3', title: '⚠️ Notas Generales', content: '' }
    ];

    this.data = this._defaultData();
    this.isEditMode = false;
    this.usesFB = false;
    this.db = null;
    this._rawFBData = {};

    this.listeners = {
      onDataChanged: [],
      onConfigChanged: [],
      onConnChanged: [],
      onNotesChanged: [],
      onModeChanged: [],
      onToast: []
    };
  }

  // --- Pub/Sub ---
  bind(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  _notify(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }

  // --- Core State ---
  _defaultData() {
    const d = {};
    this.DAYS.forEach(day => {
      d[day] = {};
      this.SHIFTS.forEach(s => { d[day][s.id] = null; });
    });
    return d;
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this._notify('onModeChanged', this.isEditMode);
  }

  // --- Firebase & LocalStorage Init ---
  init() {
    if (!this.FIREBASE_CONFIG.apiKey || !this.FIREBASE_CONFIG.databaseURL) {
      this.usesFB = false;
      this._lsLoad();
      this._notify('onConnChanged', { state: 'local', label: 'Modo local — solo este navegador' });
      this._notify('onDataChanged', this.data);
      this._notify('onNotesChanged', this.notesCategories);
      return false;
    }

    try {
      if (window.firebase) {
        window.firebase.initializeApp(this.FIREBASE_CONFIG);
        this.db = window.firebase.database();
        this.usesFB = true;
        this._notify('onConnChanged', { state: 'local', label: 'Conectando...' });
        this._listenFirebase();
        return true;
      }
    } catch(e) { 
      console.warn('Firebase init error:', e); 
      this.usesFB = false;
    }
    return false;
  }

  _listenFirebase() {
    // Schedule Data
    this.db.ref('horario').on('value', snap => {
      this._rawFBData = snap.val() || {};
      this._syncData();
    }, err => {
      this._notify('onConnChanged', { state: 'offline', label: 'Error de conexión' });
    });

    // Shifts Config
    this.db.ref('config/shiftsArr').on('value', snap => {
      if (snap.exists()) {
        this.SHIFTS = snap.val();
        this._syncData();
        this._notify('onConfigChanged', this.SHIFTS);
      }
    });

    // Notes Categories
    this.db.ref('notasCategorias').on('value', snap => {
      if (snap.exists()) {
        this.notesCategories = snap.val();
        this._notify('onNotesChanged', this.notesCategories);
      } else {
        // Init default if empty
        this.db.ref('notasCategorias').set(this.notesCategories);
      }
    });

    // Connection Presence
    this.db.ref('.info/connected').on('value', snap => {
      if (snap.val()) this._notify('onConnChanged', { state: 'online', label: 'En línea — sincronización activa' });
      else this._notify('onConnChanged', { state: 'offline', label: 'Sin conexión — reintentando...' });
    });
  }

  _syncData() {
    this.data = this._defaultData();
    this.DAYS.forEach(day => {
      this.SHIFTS.forEach(s => {
        if (this._rawFBData[day] && typeof this._rawFBData[day][s.id] === 'string') {
          this.data[day][s.id] = this._rawFBData[day][s.id] || null;
        }
      });
    });
    this._notify('onDataChanged', this.data);
  }

  // --- LocalStorage Fallback ---
  _lsSave() {
    localStorage.setItem('horario-hospital-v2', JSON.stringify(this.data));
  }
  
  _lsSaveNotes() {
    localStorage.setItem('horario-notas-cat-v2', JSON.stringify(this.notesCategories));
  }

  _lsLoad() {
    this.data = this._defaultData();
    try {
      const raw = localStorage.getItem('horario-hospital-v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.DAYS.forEach(day => {
          this.SHIFTS.forEach(s => {
            if (parsed[day] && (typeof parsed[day][s.id] === 'string' || parsed[day][s.id] === null)) {
              this.data[day][s.id] = parsed[day][s.id] || null;
            }
          });
        });
      }
      
      const nRaw = localStorage.getItem('horario-notas-cat-v2');
      if (nRaw) {
        this.notesCategories = JSON.parse(nRaw);
      }
    } catch(e) {}
  }

  // --- Actions ---
  setName(day, shiftId, name) {
    if (this.usesFB) {
      const path = `horario/${day}/${shiftId}`;
      (name ? this.db.ref(path).set(name) : this.db.ref(path).remove())
        .catch(e => this._notify('onToast', '⚠️ Error al guardar: ' + e.message));
    } else {
      this.data[day][shiftId] = name;
      this._lsSave();
      this._notify('onDataChanged', this.data);
      if (name) {
        const shift = this.SHIFTS.find(s => s.id === shiftId);
        this._notify('onToast', `✅ ${name} → ${shift ? shift.label : ''} del ${day}`);
      }
    }
  }

  updateNotesCategory(id, newContent) {
    const cat = this.notesCategories.find(c => c.id === id);
    if (cat) {
      cat.content = newContent;
      if (this.usesFB) {
        this.db.ref('notasCategorias').set(this.notesCategories);
      } else {
        this._lsSaveNotes();
      }
    }
  }
  
  saveCategoriesOrder(newCategoriesArray) {
    this.notesCategories = newCategoriesArray;
    if (this.usesFB) {
      this.db.ref('notasCategorias').set(this.notesCategories)
        .then(() => this._notify('onToast', '✅ Categorías guardadas'))
        .catch(e => this._notify('onToast', '⚠️ Error: ' + e.message));
    } else {
      this._lsSaveNotes();
      this._notify('onNotesChanged', this.notesCategories);
      this._notify('onToast', '✅ Categorías actualizadas (local)');
    }
  }

  saveShifts(newShifts) {
    if (this.usesFB) {
      this.db.ref('config/shiftsArr').set(newShifts)
        .then(() => this._notify('onToast', '✅ Turnos guardados para todos'))
        .catch(e => this._notify('onToast', '⚠️ Error: ' + e.message));
    } else {
      this.SHIFTS = newShifts;
      this._notify('onConfigChanged', this.SHIFTS);
      this._notify('onToast', '✅ Turnos actualizados (local)');
    }
  }

  clearAll() {
    if (this.usesFB) {
      this.db.ref('horario').remove().catch(e => this._notify('onToast', '⚠️ Error: ' + e.message));
    } else {
      this.data = this._defaultData();
      this._lsSave();
      this._notify('onDataChanged', this.data);
    }
    this._notify('onToast', '🗑 Horario limpiado exitosamente');
  }
}

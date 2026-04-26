import { DefectType } from './types.js';

export const DEFECTS_DB: DefectType[] = [
  // --- ENGINE ---
  { id: 'eng_1',  name: 'Задиры в цилиндрах',    category: 'Engine',      severity: 'Critical' },
  { id: 'eng_2',  name: 'Масложор',               category: 'Engine',      severity: 'Medium'   },
  { id: 'eng_3',  name: 'Пробита прокладка ГБЦ',  category: 'Engine',      severity: 'Critical' },
  { id: 'eng_4',  name: 'Убитая турбина',          category: 'Engine',      severity: 'Serious'  },
  { id: 'eng_5',  name: 'Троит двигатель',         category: 'Engine',      severity: 'Medium'   },

  // --- ELECTRICAL ---
  { id: 'elec_1', name: 'Умер блок управления (ECU)', category: 'Electrical', severity: 'Critical' },
  { id: 'elec_2', name: 'Глюки проводки',          category: 'Electrical', severity: 'Medium'   },
  { id: 'elec_3', name: 'Не работает приборка',    category: 'Electrical', severity: 'Medium'   },
  { id: 'elec_4', name: 'Севший аккумулятор',      category: 'Electrical', severity: 'Light'    },
  { id: 'elec_5', name: 'Проблемы с генератором',  category: 'Electrical', severity: 'Serious'  },

  // --- SUSPENSION ---
  { id: 'susp_1', name: 'Убитая подвеска',         category: 'Suspension', severity: 'Serious'  },
  { id: 'susp_2', name: 'Стучит рулевая рейка',    category: 'Suspension', severity: 'Critical' },
  { id: 'susp_3', name: 'Кривые диски',            category: 'Suspension', severity: 'Medium'   },
  { id: 'susp_4', name: 'Изношены тормоза',        category: 'Suspension', severity: 'Light'    },
  { id: 'susp_5', name: 'Люфт ступицы',            category: 'Suspension', severity: 'Serious'  },

  // --- BODY ---
  { id: 'body_1', name: 'Ржавчина',                category: 'Body',       severity: 'Serious'  },
  { id: 'body_2', name: 'Крашена в круг',          category: 'Body',       severity: 'Medium'   },
  { id: 'body_3', name: 'Сильная вмятина',         category: 'Body',       severity: 'Medium'   },
  { id: 'body_4', name: 'Нарушена геометрия',      category: 'Body',       severity: 'Critical' },
  { id: 'body_5', name: 'Разбитые фары',           category: 'Body',       severity: 'Light'    },

  // --- SPECIAL ---
  {
    id: 'legal_block',
    name: 'Запрет на регистрационные действия',
    category: 'Body',
    severity: 'Critical',
    preventsSale: true,
  },
];

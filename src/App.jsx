import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import competenciesData from './competencies.json';

const App = () => {
  const [competencies, setCompetencies] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedLevels, setSelectedLevels] = useState({});
  const [userName, setUserName] = useState('');
  const [isNameEntered, setIsNameEntered] = useState(false);

  // Инициализация данных и состояний
  useEffect(() => {
    const dataWithIds = competenciesData.map((comp, index) => ({
      ...comp,
      id: index + 1
    }));
    
    setCompetencies(dataWithIds);
    
    const initialSelectedItems = {};
    const initialSelectedLevels = {};
    
    dataWithIds.forEach(competency => {
      initialSelectedItems[competency.id] = {};
      initialSelectedLevels[competency.id] = {};
      
      ['А0', 'А1', 'А2', 'А3', 'Доп'].forEach(level => {
        if (competency[level]) {
          const items = competency[level].split('\n').filter(item => item.trim() !== '');
          initialSelectedItems[competency.id][level] = Array(items.length).fill(false);
          initialSelectedLevels[competency.id][level] = false;
        }
      });
    });
    
    setSelectedItems(initialSelectedItems);
    setSelectedLevels(initialSelectedLevels);
  }, []);

  // Обработчики выбора пунктов и уровней (остаются без изменений)
  const handleItemSelect = (competencyId, level, itemIndex) => {
    setSelectedItems(prev => {
      const newSelected = JSON.parse(JSON.stringify(prev));
      newSelected[competencyId][level][itemIndex] = !newSelected[competencyId][level][itemIndex];
      return newSelected;
    });

    if (selectedLevels[competencyId]?.[level]) {
      setSelectedLevels(prev => {
        const newSelected = {...prev};
        newSelected[competencyId][level] = false;
        return newSelected;
      });
    }
  };

  const handleLevelSelect = (competencyId, level) => {
    const isSelecting = !selectedLevels[competencyId]?.[level];
    const levelOrder = ["А0", "А1", "А2", "А3", "Доп"];
    const currentLevelIndex = levelOrder.indexOf(level);

    setSelectedLevels(prev => {
      const newSelected = JSON.parse(JSON.stringify(prev));
      
      if (level !== "Доп") {
        for (let i = 0; i <= currentLevelIndex; i++) {
          newSelected[competencyId][levelOrder[i]] = isSelecting;
        }
      } else {
        newSelected[competencyId][level] = isSelecting;
      }
      
      return newSelected;
    });

    setSelectedItems(prev => {
      const newSelected = JSON.parse(JSON.stringify(prev));
      
      if (level !== "Доп") {
        for (let i = 0; i <= currentLevelIndex; i++) {
          const lvl = levelOrder[i];
          if (competencies.find(c => c.id === competencyId)?.[lvl]) {
            const items = competencies.find(c => c.id === competencyId)[lvl].split('\n').filter(i => i.trim() !== '');
            newSelected[competencyId][lvl] = Array(items.length).fill(isSelecting);
          }
        }
      } else {
        if (competencies.find(c => c.id === competencyId)?.[level]) {
          const items = competencies.find(c => c.id === competencyId)[level].split('\n').filter(i => i.trim() !== '');
          newSelected[competencyId][level] = Array(items.length).fill(isSelecting);
        }
      }
      
      return newSelected;
    });
  };

  // Расчет баллов (остается без изменений)
  const calculateLevelPoints = (level) => {
    switch(level) {
      case 'А0': return 0;
      case 'А1': return 1;
      case 'А2': return 1;
      case 'А3': return 1;
      case 'Доп': return 0.5;
      default: return 0;
    }
  };

  const calculateTotalPoints = () => {
    return competencies.reduce((total, competency) => {
      return ['А0', 'А1', 'А2', 'А3', 'Доп'].reduce((compTotal, level) => {
        if (!competency[level]) return compTotal;
        
        const isLevelSelected = selectedLevels[competency.id]?.[level];
        const selectedItemsCount = selectedItems[competency.id]?.[level]?.filter(Boolean).length || 0;
        const items = competency[level].split('\n').filter(item => item.trim() !== '');
        const totalItems = items.length;

        if (isLevelSelected) {
          return compTotal + calculateLevelPoints(level);
        } else if (selectedItemsCount > 0) {
          return compTotal + (calculateLevelPoints(level) * selectedItemsCount / totalItems);
        }
        return compTotal;
      }, total);
    }, 0);
  };

  // Генерация отчета
  const generateReport = () => {
    if (!userName.trim()) {
      alert('Пожалуйста, введите ваше имя');
      return;
    }
  
    const workbook = XLSX.utils.book_new();
    
    // Создаем основной лист с невыбранными компетенциями
    const resultsData = [
      ['Отчет по матрице компетенций - Невыбранные компетенции'],
      [`Сотрудник: ${userName}`],
      [`Дата: ${new Date().toLocaleDateString()}`],
      [`Общее количество набранных баллов: ${calculateTotalPoints().toFixed(2)}`],
      [],
      ['Группа компетенций', 'Компетенция', 'Уровень', 'Невыбранные пункты']
    ];
  
    // Добавляем невыбранные компетенции
    competencies.forEach(competency => {
      ['А0', 'А1', 'А2', 'А3', 'Доп'].forEach(level => {
        if (!competency[level]) return;
        
        const items = competency[level].split('\n').filter(item => item.trim() !== '');
        const isLevelSelected = selectedLevels[competency.id]?.[level];
        const selectedItemsList = selectedItems[competency.id]?.[level] || [];
        
        // Если уровень не выбран целиком и не выбрано ни одного пункта
        if (!isLevelSelected && !selectedItemsList.some(item => item)) {
          resultsData.push([
            competency['Группа компетенций'] || 'Общие',
            competency['Компетенция'],
            level,
            'Весь уровень не выбран'
          ]);
        } 
        // Если уровень не выбран целиком, но есть невыбранные пункты
        else if (!isLevelSelected) {
          const notSelectedItems = items.filter((_, index) => !selectedItemsList[index]);
          if (notSelectedItems.length > 0) {
            resultsData.push([
              competency['Группа компетенций'] || 'Общие',
              competency['Компетенция'],
              level,
              notSelectedItems.join('; ')
            ]);
          }
        }
      });
    });
  
    const worksheet = XLSX.utils.aoa_to_sheet(resultsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Невыбранные');
  
    // Добавляем лист с выбранными компетенциями (для сравнения)
    const selectedData = [
      ['Выбранные компетенции'],
      [`Сотрудник: ${userName}`],
      [`Дата: ${new Date().toLocaleDateString()}`],
      [`Общее количество баллов: ${calculateTotalPoints().toFixed(2)}`],
      [],
      ['Группа компетенций', 'Компетенция', 'Уровень', 'Выбранные пункты']
    ];
  
    competencies.forEach(competency => {
      ['А0', 'А1', 'А2', 'А3', 'Доп'].forEach(level => {
        if (!competency[level]) return;
        
        const isLevelSelected = selectedLevels[competency.id]?.[level];
        const selectedItemsList = selectedItems[competency.id]?.[level] || [];
        
        if (isLevelSelected || selectedItemsList.some(item => item)) {
          const items = competency[level].split('\n').filter(item => item.trim() !== '');
          const selectedItemsText = isLevelSelected 
            ? 'Весь уровень выбран' 
            : items.filter((_, index) => selectedItemsList[index]).join('; ');
          
          selectedData.push([
            competency['Группа компетенций'] || 'Общие',
            competency['Компетенция'],
            level,
            selectedItemsText
          ]);
        }
      });
    });
  
    const selectedWorksheet = XLSX.utils.aoa_to_sheet(selectedData);
    XLSX.utils.book_append_sheet(workbook, selectedWorksheet, 'Выбранные');
  
    // Сохраняем файл
    XLSX.writeFile(workbook, `Матрица компетенций_${userName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Группировка по группам компетенций (без изменений)
  const groupedCompetencies = competencies.reduce((acc, competency) => {
    const group = competency["Группа компетенций"] || 'Общие';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(competency);
    return acc;
  }, {});

  return (
    <div className="app">
      <div className="header">
        <h1>Матрица компетенций</h1>
        {isNameEntered ? (
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <div className="total-points">
              Общее количество баллов: <strong>{calculateTotalPoints().toFixed(2)}</strong>
            </div>
            <button 
              className="complete-button"
              onClick={generateReport}
            >
              Завершить и скачать отчет
            </button>
          </div>
        ) : (
          <div className="name-input-container">
            <input
              type="text"
              placeholder="Введите ваше имя"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="name-input"
            />
            <button
              className="start-button"
              onClick={() => userName.trim() && setIsNameEntered(true)}
            >
              Начать
            </button>
          </div>
        )}
      </div>

      {isNameEntered && (
        <div className="content">
          {Object.entries(groupedCompetencies).map(([group, comps]) => (
            <div key={group} className="group-section">
              <h2 className="group-title">{group}</h2>
              
              <div className="competencies-container">
                {comps.map(competency => (
                  <div key={competency.id} className="competency-block">
                    <div className="competency-header">
                      <h3 className="competency-name">{competency["Компетенция"]}</h3>
                    </div>
                    
                    <div className="levels-container">
                      {['А0', 'А1', 'А2', 'А3', 'Доп'].map(level => {
                        if (!competency[level]) return null;
                        
                        const items = competency[level].split('\n').filter(item => item.trim() !== '');
                        const points = calculateLevelPoints(level);
                        
                        return (
                          <div 
                            key={level} 
                            className={`level-block ${selectedLevels[competency.id]?.[level] ? 'level-selected' : ''}`}
                          >
                            <div className="level-header">
                              <h4>{level} ({points} балл{points !== 1 ? 'а' : ''})</h4>
                              <button
                                onClick={() => handleLevelSelect(competency.id, level)}
                                className={selectedLevels[competency.id]?.[level] ? 'selected' : ''}
                              >
                                {selectedLevels[competency.id]?.[level] ? '✓' : 'Выбрать уровень'}
                              </button>
                            </div>
                            
                            <div className="level-items">
                              {items.map((item, index) => (
                                <div
                                  key={index}
                                  className={`level-item ${
                                    selectedItems[competency.id]?.[level]?.[index] || 
                                    selectedLevels[competency.id]?.[level] ? 'item-selected' : ''
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemSelect(competency.id, level, index);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedItems[competency.id]?.[level]?.[index] || 
                                      selectedLevels[competency.id]?.[level]
                                    }
                                    onChange={() => {}}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
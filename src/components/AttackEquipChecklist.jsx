import { useState, useMemo } from 'react';
import { CheckSquare, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import './AttackEquipChecklist.css';

/**
 * Componente visual de Checklist de Equipagem Passo a Passo para propostas de ataque.
 * Auxilia o jogador a realizar as trocas manuais de runas dentro do Summoners War
 * de forma ordenada, evitando bloqueios ou erros de alocação.
 *
 * @param {Object} props
 * @param {Object} props.checklist - Objeto retornado por makeAttackEquipChecklist
 * @param {string} [props.label] - Rótulo da opção (ex: 'Opção A')
 */
export default function AttackEquipChecklist({ checklist, label }) {
  const [completedMap, setCompletedMap] = useState({});

  if (!checklist || checklist.swapCount === 0) {
    return (
      <div className="attack-checklist-card">
        <div className="attack-checklist-title">
          <ShieldCheck size={16} />
          <span>Equipamento pronto: nenhuma troca de runas necessária para esta opção.</span>
        </div>
      </div>
    );
  }

  const { remove = [], equip = [], externalSources = [], swapCount } = checklist;
  const totalActions = remove.length + equip.length;

  const completedCount = useMemo(() => {
    return Object.values(completedMap).filter(Boolean).length;
  }, [completedMap]);

  const toggleAction = (actionId) => {
    setCompletedMap(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  const markAll = () => {
    const all = {};
    remove.forEach((r, idx) => { all[`remove_${idx}`] = true; });
    equip.forEach((e, idx) => { all[`equip_${idx}`] = true; });
    setCompletedMap(all);
  };

  const clearAll = () => {
    setCompletedMap({});
  };

  return (
    <div className="attack-checklist-card" aria-label={`Checklist de aplicação de runas ${label || ''}`}>
      <div className="attack-checklist-header">
        <div className="attack-checklist-title">
          <CheckSquare size={16} />
          <span>Checklist de Troca no Jogo {label ? `(${label})` : ''}</span>
        </div>
        <div className="attack-checklist-badges">
          <span className="checklist-badge badge-swaps">
            {swapCount} {swapCount === 1 ? 'troca' : 'trocas'}
          </span>
          {externalSources.length > 0 && (
            <span className="checklist-badge badge-external">
              {externalSources.length} de outros monstros
            </span>
          )}
          <span className="checklist-badge badge-progress">
            {completedCount}/{totalActions} concluídos
          </span>
        </div>
      </div>

      {externalSources.length > 0 && (
        <div className="attack-checklist-external">
          <div className="external-title">
            <AlertTriangle size={14} />
            <span>Runas vindas de outros monstros (retirar antes):</span>
          </div>
          <ul className="external-list">
            {externalSources.map((ext, idx) => (
              <li key={idx} className="external-item">
                De <strong>{ext.fromUnitName}</strong> para <strong>{ext.toUnitName}</strong>: Slot {ext.slot} (Runa #{ext.runeId})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="attack-checklist-steps">
        {remove.length > 0 && (
          <div className="checklist-phase phase-remove">
            <div className="checklist-phase-header">
              <span>Passo 1: Desequipar ({remove.length} runas para liberar slots)</span>
            </div>
            <ul className="checklist-item-list">
              {remove.map((rem, idx) => {
                const actionId = `remove_${idx}`;
                const isDone = Boolean(completedMap[actionId]);
                return (
                  <li
                    key={actionId}
                    className={`checklist-action-item ${isDone ? 'is-done' : ''}`}
                    onClick={() => toggleAction(actionId)}
                  >
                    <input
                      type="checkbox"
                      className="checklist-checkbox"
                      checked={isDone}
                      onChange={() => toggleAction(actionId)}
                      aria-label={`Desequipar runa do slot ${rem.slot} de ${rem.unitName}`}
                    />
                    <span className="checklist-slot-badge">Slot {rem.slot}</span>
                    <span className="checklist-action-text">
                      Desequipar de <strong>{rem.unitName}</strong> (Runa #{rem.runeId})
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {equip.length > 0 && (
          <div className="checklist-phase phase-equip">
            <div className="checklist-phase-header">
              <span>Passo 2: Equipar ({equip.length} runas na ordem correta)</span>
            </div>
            <ul className="checklist-item-list">
              {equip.map((eq, idx) => {
                const actionId = `equip_${idx}`;
                const isDone = Boolean(completedMap[actionId]);
                return (
                  <li
                    key={actionId}
                    className={`checklist-action-item ${isDone ? 'is-done' : ''}`}
                    onClick={() => toggleAction(actionId)}
                  >
                    <input
                      type="checkbox"
                      className="checklist-checkbox"
                      checked={isDone}
                      onChange={() => toggleAction(actionId)}
                      aria-label={`Equipar runa no slot ${eq.slot} de ${eq.unitName}`}
                    />
                    <span className="checklist-slot-badge">Slot {eq.slot}</span>
                    <span className="checklist-action-text">
                      Equipar em <strong>{eq.unitName}</strong> (Runa #{eq.runeId})
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="checklist-controls">
        <button
          type="button"
          className="checklist-btn-subtle"
          onClick={clearAll}
          disabled={completedCount === 0}
        >
          Limpar marcações
        </button>
        <button
          type="button"
          className="checklist-btn-subtle"
          onClick={markAll}
          disabled={completedCount === totalActions}
        >
          Marcar todas como feitas
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import LocationStep from './steps/LocationStep'
import SourceTypeStep from './steps/SourceTypeStep'
import QualityStep from './steps/QualityStep'
import HazardStep from './steps/HazardStep'
import ReviewStep from './steps/ReviewStep'
import { IconClose } from '../ui/Icons'
import { useLanguage } from '../../context/LanguageContext'
import './AddFlow.css'

const STEPS = ['location', 'sourceType', 'quality', 'hazard', 'review']

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function emptySourceDetails() {
  return {
    localName: '',
    depthMeters: '',
    runsDry: '',
    sampledAt: todayDate(),
    recentRain: '',
  }
}
export default function AddFlowSheet({
  editSampleId = null,
  initialData = null,
  location,
  onLocationChange,
  onPanRequest,
  onClose,
  onStepChange,
  onSaved,
}) {
  const { t } = useLanguage()
  const { qualityMeasures, addQualityMeasure, addSample, updateSample } = useAppState()
  const [stepIndex, setStepIndex] = useState(0)
  const [sourceType, setSourceType] = useState(null)
  const [sourceDetails, setSourceDetails] = useState(emptySourceDetails)
  const [readings, setReadings] = useState([])
  const [hazards, setHazards] = useState(null)

  const isEdit = Boolean(editSampleId)
  const step = STEPS[stepIndex]

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (!editSampleId || !initialData) return
    setSourceType(initialData.sourceType)
    setSourceDetails({
      localName: initialData.localName ?? '',
      depthMeters: initialData.depthMeters != null ? String(initialData.depthMeters) : '',
      runsDry: initialData.runsDry ?? '',
      sampledAt: initialData.sampledAt ? String(initialData.sampledAt).slice(0, 10) : todayDate(),
      recentRain: initialData.recentRain ?? '',
    })
    setReadings(initialData.readings)
    setHazards(initialData.hazards ?? [])
    onLocationChange(initialData.position)
    setStepIndex(0)
  }, [editSampleId, initialData, onLocationChange])

  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const canAdvance = {
    location: Boolean(location),
    sourceType: Boolean(sourceType),
    quality: readings.length > 0,
    hazard: hazards !== null,
    review: true,
  }[step]

  function goToStep(stepKey) {
    const index = STEPS.indexOf(stepKey)
    if (index >= 0) setStepIndex(index)
  }

  function handleNext() {
    if (!canAdvance) return
    if (isLast) {
      const depth = Number.parseFloat(sourceDetails.depthMeters)
      const payload = {
        position: location,
        sourceType,
        depthMeters:
          sourceType === 'Dug well' && Number.isFinite(depth) && depth >= 0 ? depth : null,
        readings,
        hazards: hazards ?? [],
      }
      if (isEdit) {
        updateSample(editSampleId, payload)
        onSaved?.(editSampleId)
      } else {
        addSample(payload)
      }
      onClose()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function handleBack() {
    if (isFirst) {
      onClose()
      return
    }
    setStepIndex((i) => i - 1)
  }

  return (
    <div className="flow-sheet">
      <div className="flow-sheet-header">
        <button type="button" className="flow-close" onClick={onClose} aria-label={t('flow.cancel')}>
          <IconClose />
        </button>
        {isEdit ? (
          <h2 className="flow-edit-title">{t('flow.editTitle')}</h2>
        ) : (
          <div className="flow-progress">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`flow-dot${i === stepIndex ? ' flow-dot--active' : ''}${i < stepIndex ? ' flow-dot--done' : ''}`}
                title={t(`flow.step.${s}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flow-sheet-body">
        <div hidden={step !== 'location'}>
          <LocationStep
            location={location}
            onPick={onLocationChange}
            onPan={onPanRequest}
          />
        </div>
        <div hidden={step !== 'sourceType'}>
          <SourceTypeStep
            sourceType={sourceType}
            onChange={setSourceType}
            details={sourceDetails}
            onDetailsChange={setSourceDetails}
          />
        </div>
        <div hidden={step !== 'quality'}>
          <QualityStep
            qualityMeasures={qualityMeasures}
            readings={readings}
            onChange={setReadings}
            onAddMeasure={addQualityMeasure}
          />
        </div>
        <div hidden={step !== 'hazard'}>
          <HazardStep value={hazards} onChange={setHazards} />
        </div>
        <div hidden={step !== 'review'}>
          <ReviewStep
            location={location}
            sourceType={sourceType}
            sourceDetails={sourceDetails}
            readings={readings}
            hazards={hazards ?? []}
            qualityMeasures={qualityMeasures}
            onEdit={goToStep}
          />
        </div>
      </div>

      <div className="flow-sheet-footer">
        <button type="button" className="btn-ghost" onClick={handleBack}>
          {isFirst ? t('flow.cancel') : t('flow.back')}
        </button>
        <button type="button" className="btn-primary" onClick={handleNext} disabled={!canAdvance}>
          {step === 'review' ? (isEdit ? t('flow.save') : t('flow.submit')) : t('flow.continue')}
        </button>
      </div>
    </div>
  )
}

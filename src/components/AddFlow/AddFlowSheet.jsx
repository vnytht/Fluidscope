import { useEffect, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import LocationStep from './steps/LocationStep'
import SourceTypeStep from './steps/SourceTypeStep'
import QualityStep from './steps/QualityStep'
import HazardStep from './steps/HazardStep'
import ReviewStep from './steps/ReviewStep'
import { IconClose } from '../ui/Icons'
import './AddFlow.css'

const STEPS = ['location', 'sourceType', 'quality', 'hazard', 'review']
const STEP_LABELS = {
  location: 'Location',
  sourceType: 'Source',
  quality: 'Readings',
  hazard: 'Hazard',
  review: 'Review',
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
  const { qualityMeasures, addQualityMeasure, addSample, updateSample } = useAppState()
  const [stepIndex, setStepIndex] = useState(0)
  const [sourceType, setSourceType] = useState(null)
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
      const payload = {
        position: location,
        sourceType,
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
        <button type="button" className="flow-close" onClick={onClose} aria-label="Cancel">
          <IconClose />
        </button>
        {isEdit ? (
          <h2 className="flow-edit-title">Edit source</h2>
        ) : (
          <div className="flow-progress">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`flow-dot${i === stepIndex ? ' flow-dot--active' : ''}${i < stepIndex ? ' flow-dot--done' : ''}`}
                title={STEP_LABELS[s]}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flow-sheet-body">
        {step === 'location' && (
          <LocationStep
            location={location}
            onPick={onLocationChange}
            onPan={onPanRequest}
          />
        )}
        {step === 'sourceType' && (
          <SourceTypeStep sourceType={sourceType} onChange={setSourceType} />
        )}
        {step === 'quality' && (
          <QualityStep
            qualityMeasures={qualityMeasures}
            readings={readings}
            onChange={setReadings}
            onAddMeasure={addQualityMeasure}
          />
        )}
        {step === 'hazard' && <HazardStep value={hazards} onChange={setHazards} />}
        {step === 'review' && (
          <ReviewStep
            location={location}
            sourceType={sourceType}
            readings={readings}
            hazards={hazards ?? []}
            qualityMeasures={qualityMeasures}
            onEdit={goToStep}
          />
        )}
      </div>

      <div className="flow-sheet-footer">
        <button type="button" className="btn-ghost" onClick={handleBack}>
          {isFirst ? 'Cancel' : 'Back'}
        </button>
        <button type="button" className="btn-primary" onClick={handleNext} disabled={!canAdvance}>
          {step === 'review' ? (isEdit ? 'Save' : 'Submit to map') : 'Continue'}
        </button>
      </div>
    </div>
  )
}

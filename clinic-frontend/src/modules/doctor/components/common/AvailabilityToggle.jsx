import React, { useState } from 'react';
import { Button, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { CheckCircle, XCircle, Clock, Power } from 'react-feather';

const AvailabilityToggle = ({ currentStatus = 'Available', onStatusChange }) => {
  const [isChanging, setIsChanging] = useState(false);

  const getStatusConfig = (status) => {
    const configs = {
      Available: {
        variant: 'success',
        icon: <CheckCircle size={16} />,
        text: 'Available',
        tooltip: 'You are available for consultations'
      },
      Busy: {
        variant: 'danger',
        icon: <XCircle size={16} />,
        text: 'Busy',
        tooltip: 'You are currently busy'
      },
      'On Leave': {
        variant: 'warning',
        icon: <Clock size={16} />,
        text: 'On Leave',
        tooltip: 'You are on leave'
      }
    };
    return configs[status] || configs.Available;
  };

  const handleToggle = async () => {
    if (isChanging) return;
    
    setIsChanging(true);
    try {
      const newStatus = currentStatus === 'Available' ? 'Busy' : 'Available';
      if (onStatusChange) {
        await onStatusChange(newStatus);
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const config = getStatusConfig(currentStatus);

  return (
    <div className="d-flex align-items-center">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip>{config.tooltip}</Tooltip>}
      >
        <Badge bg={config.variant} className="d-flex align-items-center py-2 px-3">
          {config.icon}
          <span className="ms-2">{config.text}</span>
        </Badge>
      </OverlayTrigger>
      
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip>Toggle Availability</Tooltip>}
      >
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={handleToggle}
          disabled={isChanging}
          className="ms-2"
        >
          {isChanging ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            <Power size={14} />
          )}
        </Button>
      </OverlayTrigger>
    </div>
  );
};

export default AvailabilityToggle;
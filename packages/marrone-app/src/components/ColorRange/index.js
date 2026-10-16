import StyledWrapper from './StyledWrapper';
import i18n from '../../i18n';

const ColorRangePicker = ({ selectedColor, className, value, onChange, colorRange, ...props }) => {
  return (
    <StyledWrapper color={selectedColor} className={className}>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className="hue-slider"
        style={{
          background: `linear-gradient(to right, ${colorRange.join(',')})`
        }}
        title={i18n.t('UI.ADJUST_COLOR')}
        {...props}
      />
    </StyledWrapper>
  );
};

export default ColorRangePicker;

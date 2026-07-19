import './PartResultCard.css';

export default function PartResultCard({ part, isSelected, onSelect }) {

    return (
        <div className={isSelected ? 'partResultCard partResultCardSelected' : 'partResultCard'}>
            <div className="partResultInfo">
                <p>{part.description}</p>
                <p>Part #: {part.partNumber}</p>
            </div>
            <div className="selectPart">
                <button className="selectButton" onClick={() => onSelect(part)}>
                    {isSelected ? 'Selected' : 'Select'}
                </button>
            </div>
        </div>
    );
}

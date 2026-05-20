import React, { useState, useEffect, useRef } from 'react';
import './AddressDropdown.css';

export default function AddressDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('province'); // province, district, ward
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProvince = (p) => {
    setSelectedProvince(p);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`)
      .then(res => res.json())
      .then(data => {
        setDistricts(data.districts);
        setActiveTab('district');
      });
  };

  const handleSelectDistrict = (d) => {
    setSelectedDistrict(d);
    setSelectedWard(null);
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`)
      .then(res => res.json())
      .then(data => {
        setWards(data.wards);
        setActiveTab('ward');
      });
  };

  const handleSelectWard = (w) => {
    setSelectedWard(w);
    setIsOpen(false);
    const fullAddress = `${w.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
    onChange(fullAddress);
  };

  const displayValue = value || (selectedWard ? `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}` : '');

  return (
    <div className="address-dropdown-container" ref={containerRef}>
      <input
        className="form-control"
        placeholder="Phường/Xã, Quận/Huyện, Tỉnh/TP"
        value={displayValue}
        onClick={() => setIsOpen(true)}
        readOnly
        style={{ cursor: 'pointer', backgroundColor: '#fff' }}
      />
      {isOpen && (
        <div className="address-dropdown-menu">
          <div className="address-tabs">
            <div className={`address-tab ${activeTab === 'province' ? 'active' : ''}`} onClick={() => setActiveTab('province')}>Tỉnh / TP</div>
            <div className={`address-tab ${activeTab === 'district' ? 'active' : ''}`} onClick={() => setActiveTab('district')}>Quận / Huyện</div>
            <div className={`address-tab ${activeTab === 'ward' ? 'active' : ''}`} onClick={() => setActiveTab('ward')}>Phường / Xã</div>
          </div>
          <div className="address-list">
            {activeTab === 'province' && (
              provinces.map(p => (
                <div key={p.code} className={`address-list-item ${selectedProvince?.code === p.code ? 'selected' : ''}`} onClick={() => handleSelectProvince(p)}>
                  {p.name}
                </div>
              ))
            )}
            {activeTab === 'district' && (
              districts.length > 0 ? districts.map(d => (
                <div key={d.code} className={`address-list-item ${selectedDistrict?.code === d.code ? 'selected' : ''}`} onClick={() => handleSelectDistrict(d)}>
                  {d.name}
                </div>
              )) : <div className="address-list-empty">Vui lòng chọn Tỉnh / TP trước</div>
            )}
            {activeTab === 'ward' && (
              wards.length > 0 ? wards.map(w => (
                <div key={w.code} className={`address-list-item ${selectedWard?.code === w.code ? 'selected' : ''}`} onClick={() => handleSelectWard(w)}>
                  {w.name}
                </div>
              )) : <div className="address-list-empty">Vui lòng chọn Quận / Huyện trước</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

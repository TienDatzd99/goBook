import React, { useState, useEffect, useRef } from 'react';
import './AddressDropdown.css';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://gobook.up.railway.app' : 'http://localhost:3001');

export default function AddressDropdown({ value, onChange, onSelect, initial }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('province'); // province, district, ward
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    const loadProvinces = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`${API_BASE}/api/shipping/ghn/provinces`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Không tải được danh sách tỉnh/thành');
        const list = Array.isArray(data) ? data : (data.data || []);
        setProvinces(list.map(p => ({ id: p.ProvinceID, name: p.ProvinceName, code: p.Code })));
      } catch (error) {
        console.error(error);
        setLoadError(error.message || 'Không tải được danh sách địa chỉ');
      } finally {
        setLoading(false);
      }
    };

    loadProvinces();
  }, []);

  // if initial selection provided, attempt to pre-select
  useEffect(() => {
    if (!initial) return;
    if (provinces.length === 0) return;
    if (initial.provinceId) {
      const p = provinces.find(x => x.id === initial.provinceId);
      if (p) handleSelectProvince(p);
    }
  }, [initial, provinces]);

  useEffect(() => {
    if (!initial) return;
    if (districts.length === 0) return;
    if (initial.districtId) {
      const d = districts.find(x => x.id === initial.districtId);
      if (d) handleSelectDistrict(d);
    }
  }, [initial, districts]);

  useEffect(() => {
    if (!initial) return;
    if (wards.length === 0) return;
    if (initial.wardCode) {
      const w = wards.find(x => x.code === initial.wardCode);
      if (w) handleSelectWard(w);
    }
  }, [initial, wards]);

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
    setLoading(true);
    setLoadError('');
    fetch(`${API_BASE}/api/shipping/ghn/districts/${p.id}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'Không tải được quận/huyện');
        const list = Array.isArray(data) ? data : (data.data || []);
        setDistricts(list.map(d => ({ id: d.DistrictID, name: d.DistrictName, code: d.Code })));
        setActiveTab('district');
      })
      .catch((error) => {
        console.error(error);
        setLoadError(error.message || 'Không tải được quận/huyện');
      })
      .finally(() => setLoading(false));
  };

  const handleSelectDistrict = (d) => {
    setSelectedDistrict(d);
    setSelectedWard(null);
    setWards([]);
    setLoading(true);
    setLoadError('');
    fetch(`${API_BASE}/api/shipping/ghn/wards/${d.id}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'Không tải được phường/xã');
        const list = Array.isArray(data) ? data : (data.data || []);
        setWards(list.map(w => ({ code: w.WardCode, name: w.WardName })));
        setActiveTab('ward');
      })
      .catch((error) => {
        console.error(error);
        setLoadError(error.message || 'Không tải được phường/xã');
      })
      .finally(() => setLoading(false));
  };

  const handleSelectWard = (w) => {
    setSelectedWard(w);
    setIsOpen(false);
    const display = `${w.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
    if (typeof onChange === 'function') onChange(display);
    if (typeof onSelect === 'function') {
      onSelect({
        provinceId: selectedProvince?.id,
        provinceName: selectedProvince?.name,
        districtId: selectedDistrict?.id,
        districtName: selectedDistrict?.name,
        wardCode: w.code,
        wardName: w.name,
        display,
      });
    }
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
            {loading && <div className="address-list-empty">Đang tải dữ liệu...</div>}
            {!loading && loadError && <div className="address-list-empty">{loadError}</div>}
            {activeTab === 'province' && (
              provinces.length > 0 ? provinces.map(p => (
                <div key={p.id} className={`address-list-item ${selectedProvince?.id === p.id ? 'selected' : ''}`} onClick={() => handleSelectProvince(p)}>
                  {p.name}
                </div>
              )) : (!loading && !loadError ? <div className="address-list-empty">Không có dữ liệu tỉnh/thành</div> : null)
            )}
            {activeTab === 'district' && (
              districts.length > 0 ? districts.map(d => (
                <div key={d.id} className={`address-list-item ${selectedDistrict?.id === d.id ? 'selected' : ''}`} onClick={() => handleSelectDistrict(d)}>
                  {d.name}
                </div>
              )) : (!loading && !loadError ? <div className="address-list-empty">Vui lòng chọn Tỉnh / TP trước</div> : null)
            )}
            {activeTab === 'ward' && (
              wards.length > 0 ? wards.map(w => (
                <div key={w.code} className={`address-list-item ${selectedWard?.code === w.code ? 'selected' : ''}`} onClick={() => handleSelectWard(w)}>
                  {w.name}
                </div>
              )) : (!loading && !loadError ? <div className="address-list-empty">Vui lòng chọn Quận / Huyện trước</div> : null)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

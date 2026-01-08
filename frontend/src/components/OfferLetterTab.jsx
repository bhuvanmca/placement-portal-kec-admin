import React, { useState } from 'react';
import './OfferLetterTab.css';

const OfferLetterTab = () => {
    const [selectedCompany, setSelectedCompany] = useState('All');
    const [selectedDept, setSelectedDept] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Sample Data for Offers Repository (Maintaining student details, company, and department)
    const offersData = [
        { id: 'STU001', name: 'Arun Kumar', dept: 'CSE', company: 'Google', designation: 'Software Engineer', salary: '12 LPA', status: 'Accepted', logo: 'https://logo.clearbit.com/google.com' },
        { id: 'STU002', name: 'Priya Dharshini', dept: 'ECE', company: 'Qualcomm', designation: 'Hardware Engineer', salary: '10 LPA', status: 'Signed', logo: 'https://logo.clearbit.com/qualcomm.com' },
        { id: 'STU003', name: 'Sanjay S', dept: 'IT', company: 'Microsoft', designation: 'Data Analyst', salary: '15 LPA', status: 'Pending', logo: 'https://logo.clearbit.com/microsoft.com' },
        { id: 'STU004', name: 'Deepika R', dept: 'CSE', company: 'Google', designation: 'UX Researcher', salary: '11 LPA', status: 'Accepted', logo: 'https://logo.clearbit.com/google.com' },
        { id: 'STU005', name: 'Vijay Anand', dept: 'EEE', company: 'Tesla', designation: 'Systems Engineer', salary: '14 LPA', status: 'Signed', logo: 'https://logo.clearbit.com/tesla.com' },
        { id: 'STU006', name: 'Kavitha M', dept: 'IT', company: 'Amazon', designation: 'SDE-1', salary: '18 LPA', status: 'Accepted', logo: 'https://logo.clearbit.com/amazon.com' },
        { id: 'STU007', name: 'Rahul G', dept: 'Mech', company: 'L&T', designation: 'GET', salary: '6.5 LPA', status: 'Pending', logo: 'https://logo.clearbit.com/larsentoubro.com' },
        { id: 'STU008', name: 'Sneha P', dept: 'CSE', company: 'Zoho', designation: 'Web Developer', salary: '8 LPA', status: 'Signed', logo: 'https://logo.clearbit.com/zoho.com' },
    ];

    const companies = ['All', 'Google', 'Microsoft', 'Amazon', 'Qualcomm', 'Tesla', 'Zoho', 'L&T'];
    const departments = ['All', 'CSE', 'IT', 'ECE', 'EEE', 'Mech'];
    const statuses = ['All', 'Accepted', 'Signed', 'Pending'];

    const filteredOffers = offersData.filter(offer =>
        (selectedCompany === 'All' || offer.company === selectedCompany) &&
        (selectedDept === 'All' || offer.dept === selectedDept) &&
        (selectedStatus === 'All' || offer.status === selectedStatus) &&
        (offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            offer.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getDeptWiseCount = () => {
        const counts = {};
        filteredOffers.forEach(o => {
            counts[o.dept] = (counts[o.dept] || 0) + 1;
        });
        return counts;
    };

    const getCompanyWiseCount = () => {
        const counts = {};
        filteredOffers.forEach(o => {
            counts[o.company] = (counts[o.company] || 0) + 1;
        });
        return counts;
    };

    return (
        <div className="offer-letter-outer">
            <div className="repository-view">
                {/* Analytics Header */}
                <div className="analytics-summary-row">
                    <div className="analytics-card">
                        <div className="analytics-icon blue"><i className="fas fa-file-contract"></i></div>
                        <div className="analytics-info">
                            <span className="analytics-val">{filteredOffers.length}</span>
                            <span className="analytics-lab">Total Offers Collected</span>
                        </div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon green"><i className="fas fa-check-circle"></i></div>
                        <div className="analytics-info">
                            <span className="analytics-val">{filteredOffers.filter(o => o.status === 'Accepted').length}</span>
                            <span className="analytics-lab">Confirmed Placements</span>
                        </div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon purple"><i className="fas fa-university"></i></div>
                        <div className="analytics-info">
                            <span className="analytics-val">{Object.keys(getDeptWiseCount()).length}</span>
                            <span className="analytics-lab">Active Departments</span>
                        </div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon orange"><i className="fas fa-briefcase"></i></div>
                        <div className="analytics-info">
                            <span className="analytics-val">{Object.keys(getCompanyWiseCount()).length}</span>
                            <span className="analytics-lab">Partner Companies</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="repository-content-grid">
                    {/* Repository Table Side */}
                    <div className="repo-table-container">
                        <div className="repo-header-controls">
                            <div className="repo-title-search">
                                <h3>Placement & Offer Repository</h3>
                                <div className="repo-search-box">
                                    <i className="fas fa-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="repo-filters">
                                <div className="repo-filter-box">
                                    <label>Company</label>
                                    <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="repo-filter-box">
                                    <label>Department</label>
                                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="repo-filter-box">
                                    <label>Status</label>
                                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="repo-table-wrapper">
                            <table className="repo-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Student Name</th>
                                        <th>Department</th>
                                        <th>Hiring Company</th>
                                        <th>Designation</th>
                                        <th>CTC</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOffers.map(offer => (
                                        <tr key={offer.id}>
                                            <td><span className="id-badge">{offer.id}</span></td>
                                            <td className="st-name">{offer.name}</td>
                                            <td><span className="dept-tag">{offer.dept}</span></td>
                                            <td>
                                                <div className="company-info-cell">
                                                    <img src={offer.logo} alt={offer.company} className="company-logo-sm" />
                                                    <span>{offer.company}</span>
                                                </div>
                                            </td>
                                            <td>{offer.designation}</td>
                                            <td className="salary-text">{offer.salary}</td>
                                            <td><span className={`status-pill ${offer.status.toLowerCase()}`}>{offer.status}</span></td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="view-btn-repo" title="View Details"><i className="fas fa-external-link-alt"></i></button>
                                                    <button className="edit-btn-repo" title="Edit Offer"><i className="fas fa-pencil-alt"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Stats Panel Side */}
                    <div className="repo-stats-panel">
                        <div className="stats-box">
                            <h4>Department-wise Hires</h4>
                            <div className="stats-list">
                                {Object.entries(getDeptWiseCount()).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                                    <div className="stats-list-item" key={dept}>
                                        <span className="stats-name">{dept}</span>
                                        <div className="stats-bar-container">
                                            <div className="stats-bar" style={{ width: `${(count / filteredOffers.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stats-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="stats-box">
                            <h4>Company-wise Hires</h4>
                            <div className="stats-list">
                                {Object.entries(getCompanyWiseCount()).sort((a, b) => b[1] - a[1]).map(([comp, count]) => (
                                    <div className="stats-list-item" key={comp}>
                                        <span className="stats-name">{comp}</span>
                                        <div className="stats-bar-container">
                                            <div className="stats-bar company" style={{ width: `${(count / filteredOffers.length) * 100}%` }}></div>
                                        </div>
                                        <span className="stats-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfferLetterTab;

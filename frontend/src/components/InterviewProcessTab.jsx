import React, { useState } from 'react';
import './InterviewProcessTab.css';

const InterviewProcessTab = () => {
    const [activeRound, setActiveRound] = useState(1);

    const rounds = [
        { id: 1, name: 'Round 01: Pre-Placement Talk', type: 'PPT', status: 'Completed', count: 540 },
        { id: 2, name: 'Round 02: Online Assessment', type: 'Aptitude/Coding', status: 'In Progress', count: 480 },
        { id: 3, name: 'Round 03: Group Discussion', type: 'GD', status: 'Upcoming', count: 120 },
        { id: 4, name: 'Round 04: Technical Interview', type: 'Interview', status: 'Upcoming', count: 40 },
        { id: 5, name: 'Round 05: HR Interview', type: 'Interview', status: 'Upcoming', count: 15 }
    ];

    const currentRoundData = rounds.find(r => r.id === activeRound);

    return (
        <div className="interview-container">
            {/* Live Progression Funnel */}
            <div className="funnel-overview">
                <div className="funnel-stage">
                    <span className="stage-val">540</span>
                    <span className="stage-lab">Applied</span>
                </div>
                <div className="funnel-stage">
                    <span className="stage-val">480</span>
                    <span className="stage-lab">Post PPT</span>
                </div>
                <div className="funnel-stage">
                    <span className="stage-val">120</span>
                    <span className="stage-lab">Assessed</span>
                </div>
                <div className="funnel-stage">
                    <span className="stage-val">40</span>
                    <span className="stage-lab">Shortlisted</span>
                </div>
                <div className="funnel-stage">
                    <span className="stage-val">--</span>
                    <span className="stage-lab">Hired</span>
                </div>
            </div>

            <div className="interview-grid">
                {/* Timeline Sidebar */}
                <div className="timeline-card">
                    <h4>Interview Pipeline</h4>
                    <div className="timeline-list">
                        {rounds.map((round) => (
                            <div
                                key={round.id}
                                className={`timeline-item ${activeRound === round.id ? 'active' : ''} ${round.status === 'Completed' ? 'completed' : ''}`}
                                onClick={() => setActiveRound(round.id)}
                            >
                                <div className="timeline-dot">
                                    {round.status === 'Completed' ? <i className="fas fa-check"></i> : round.id}
                                </div>
                                <div className="timeline-info">
                                    <span>{round.type}</span>
                                    <small>{round.status}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* detailed configuration workspace */}
                <div className="round-detail-card">
                    <div className="detail-header">
                        <div className="detail-header-left">
                            <h3>{currentRoundData.name}</h3>
                            <span className="status-badge">{currentRoundData.status}</span>
                        </div>
                        <div className="detail-header-actions">
                            <button className="footer-btn btn-secondary">
                                <i className="fas fa-download"></i> Attendance PDF
                            </button>
                        </div>
                    </div>

                    <div className="detail-content">
                        {/* Round Configuration */}
                        <div className="config-section">
                            <h5>General Configuration</h5>
                            <div className="detail-grid">
                                <div className="config-box">
                                    <label>Round Format</label>
                                    <select defaultValue={currentRoundData.type}>
                                        <option>Online Assessment</option>
                                        <option>Offline MCQ</option>
                                        <option>Group Discussion</option>
                                        <option>Technical Interview</option>
                                        <option>HR Interview</option>
                                    </select>
                                </div>
                                <div className="config-box">
                                    <label>Platform / Venue</label>
                                    <input type="text" placeholder="e.g., HackerRank or LAB 05" />
                                </div>
                                <div className="config-box">
                                    <label>Schedule Date</label>
                                    <input type="date" />
                                </div>
                                <div className="config-box">
                                    <label>Estimated Duration</label>
                                    <select>
                                        <option>30 Minutes</option>
                                        <option>60 Minutes</option>
                                        <option>90 Minutes</option>
                                        <option>2 Hours</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Assessment Parameters */}
                        <div className="config-section">
                            <h5>Evaluation Rubric</h5>
                            <div className="rubric-list">
                                <div className="rubric-item">
                                    <div className="rubric-info">
                                        <h6>Problem Solving</h6>
                                        <p>Logic and algorithmic efficiency</p>
                                    </div>
                                    <div className="weightage-input">
                                        <input type="number" defaultValue="40" />
                                        <span>%</span>
                                    </div>
                                </div>
                                <div className="rubric-item">
                                    <div className="rubric-info">
                                        <h6>Coding Standards</h6>
                                        <p>Clean code and documentation</p>
                                    </div>
                                    <div className="weightage-input">
                                        <input type="number" defaultValue="30" />
                                        <span>%</span>
                                    </div>
                                </div>
                                <div className="rubric-item">
                                    <div className="rubric-info">
                                        <h6>Technical Depth</h6>
                                        <p>Knowledge of core concepts</p>
                                    </div>
                                    <div className="weightage-input">
                                        <input type="number" defaultValue="30" />
                                        <span>%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-footer">
                        <button className="footer-btn btn-secondary">
                            <i className="fas fa-trash-alt"></i> Delete Round
                        </button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="footer-btn btn-secondary">Save Draft</button>
                            <button className="footer-btn btn-primary">Update Round Details</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewProcessTab;

# Tax Harvesting Algorithm Changelog

## Version 1.0.1 (2025-08-02)

### Changed
- Enhanced safeguards against overshooting targets
- Improved targeting precision with progressive tolerances
- Added utilities integration for better code reuse
- Implemented auto-validation of algorithm integrity

### Fixed
- Fixed algorithm overshooting targets when handling large positions
- Improved early termination logic to prevent target boundary crossing
- Enhanced partial position handling with stricter limits

## Version 1.0.0 (2025-08-01)

### Added
- Initial stable version with strict target adherence
- 5% maximum target overshoot protection
- Progressive tolerance based on target size
- Early termination at 90% of target
- Special handling for large targets

### Changed
- Improved lot selection strategy for more efficient targeting
- Enhanced logging for better debugging and auditing

### Fixed
- Fixed algorithm exceeding tax loss harvesting targets
- Fixed algorithm exceeding tax gain harvesting targets

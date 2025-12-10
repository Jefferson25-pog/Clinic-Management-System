// src/utils/validation.js
export const validation = {
  // Phone number validation (Indian standard)
  validatePhone: (phone) => {
    if (!phone) return { valid: false, message: 'Phone number is required' };
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, message: 'Phone number must start with 6-9 and be exactly 10 digits' };
    }
    return { valid: true, message: '' };
  },

  // Email validation - FIXED
  validateEmail: (email) => {
    if (!email) return { valid: false, message: 'Email is required' };
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Enter a valid email address with proper domain' };
    }
    
    // Optional: Check for specific domains
    // const validDomains = ['.com', '.in', '.org', '.net', '.co.in', '.gov.in', '.edu', '.ac.in'];
    // const hasValidDomain = validDomains.some(domain => email.toLowerCase().endsWith(domain));
    // if (!hasValidDomain) {
    //   return { valid: false, message: 'Email must have a valid domain (e.g., @gmail.com, @yahoo.in)' };
    // }
    
    return { valid: true, message: '' };
  },

  // Pincode validation (6 digits)
  validatePincode: (pincode) => {
    if (!pincode) return { valid: true, message: '' };
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return { valid: false, message: 'Pincode must be exactly 6 digits' };
    }
    return { valid: true, message: '' };
  },

  // IFSC code validation
  validateIFSC: (ifsc) => {
    if (!ifsc) return { valid: true, message: '' };
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
      return { valid: false, message: 'IFSC code must be in format: ABCD0123456' };
    }
    return { valid: true, message: '' };
  },

  // Account number validation (9-18 digits)
  validateAccountNumber: (accountNumber) => {
    if (!accountNumber) return { valid: true, message: '' };
    const accountRegex = /^\d{9,18}$/;
    if (!accountRegex.test(accountNumber)) {
      return { valid: false, message: 'Account number must be 9-18 digits' };
    }
    return { valid: true, message: '' };
  },

  // Date of Birth validation
  validateDOB: (dob, role = '') => {
    if (!dob) return { valid: false, message: 'Date of Birth is required' };
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Minimum 18 years for all staff
    if (age < 18) {
      return { valid: false, message: 'Staff must be at least 18 years old' };
    }

    // Doctors must be at least 25 years
    if (role === 'Doctor' && age < 25) {
      return { valid: false, message: 'Doctors must be at least 25 years old' };
    }

    // Maximum 70 years for all staff
    if (age > 70) {
      return { valid: false, message: 'Staff age cannot exceed 70 years' };
    }

    return { valid: true, message: `Age: ${age} years` };
  },

  // Joining Date validation
  validateJoiningDate: (joiningDate) => {
    if (!joiningDate) return { valid: true, message: '' };
    
    const selectedDate = new Date(joiningDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { valid: false, message: 'Joining date cannot be in the past. It must be today or in the future.' };
    }

    return { valid: true, message: '' };
  },

  // Experience validation
  validateExperience: (experience, dob, qualifications = []) => {
    if (!experience || experience === '') return { valid: true, message: '' };
    
    const expNum = parseInt(experience);
    if (isNaN(expNum) || expNum < 0) {
      return { valid: false, message: 'Experience cannot be negative' };
    }
    
    if (expNum > 50) {
      return { valid: false, message: 'Experience cannot exceed 50 years' };
    }

    // Validate against age if DOB is provided
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const maxExperienceFromAge = Math.max(0, age - 18);
      if (expNum > maxExperienceFromAge) {
        return { 
          valid: false, 
          message: `Experience (${expNum} years) is unrealistic for a ${age}-year-old. Maximum possible: ${maxExperienceFromAge} years.` 
        };
      }

      // For qualifications: validate against qualification year
      if (qualifications.length > 0 && qualifications.some(q => q.year_completed)) {
        const earliestQualYear = Math.min(...qualifications.filter(q => q.year_completed).map(q => q.year_completed));
        const currentYear = today.getFullYear();
        const maxExperienceFromQual = Math.max(0, currentYear - earliestQualYear);
        
        if (expNum > maxExperienceFromQual) {
          return { 
            valid: false, 
            message: `Experience (${expNum} years) exceeds maximum based on qualifications. Earliest qualification: ${earliestQualYear}` 
          };
        }
      }
    }

    return { valid: true, message: '' };
  },

  // Consultation fees validation
  validateConsultationFees: (fees, role) => {
    if (role !== 'Doctor') return { valid: true, message: '' };
    if (!fees || fees === '') return { valid: false, message: 'Consultation fees are required for doctors' };
    
    const feesNum = parseFloat(fees);
    if (isNaN(feesNum) || feesNum < 0) {
      return { valid: false, message: 'Consultation fees cannot be negative' };
    }
    
    if (feesNum > 50000) {
      return { valid: false, message: 'Consultation fees cannot exceed ₹50,000' };
    }
    
    if (feesNum <= 0) {
      return { valid: false, message: 'Doctors must have consultation fees greater than 0' };
    }

    return { valid: true, message: '' };
  },

  // Salary validation
  validateSalary: (salary) => {
    if (!salary || salary === '') return { valid: true, message: '' };
    
    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      return { valid: false, message: 'Salary cannot be negative' };
    }
    
    if (salaryNum > 1000000) {
      return { valid: false, message: 'Salary cannot exceed ₹10,00,000 per month' };
    }

    return { valid: true, message: '' };
  },

  // License number format validation by role
  validateLicenseNumber: (license, role) => {
    if (!license || license === '') {
      if (role === 'Doctor') {
        return { valid: false, message: 'License number is required for doctors' };
      }
      return { valid: true, message: '' };
    }

    // Medical license formats
    const medicalFormats = [
      /^\d{5,10}$/, // MCI Registration Number
      /^[A-Z]{2}\/\d{4,6}\/\d{4}$/, // State Medical Council (e.g., TN/12345/2010)
    ];

    // Pharmacy license formats
    const pharmacyFormats = [
      /^PCI-\d{5,8}$/, // Pharmacy Council of India
      /^[A-Z]{2}\/\d{4,6}\/\d{4}$/, // State Pharmacy Council
    ];

    // Lab technician license formats
    const labTechFormats = [
      /^DMLT-\d{4,6}$/,
      /^BMLT-\d{4,6}$/,
      /^[A-Z]{2}\/LT\/\d{4,6}$/,
    ];

    let formats = [];
    let errorMessage = '';

    switch (role) {
      case 'Doctor':
        formats = medicalFormats;
        errorMessage = 'Invalid medical license format. Should be like: 123456 (MCI) or TN/12345/2010 (State Medical Council)';
        break;
      case 'Pharmacist':
        formats = pharmacyFormats;
        errorMessage = 'Invalid pharmacy license format. Should be like: PCI-12345 or KA/1234/2015';
        break;
      case 'Lab Technician':
        formats = labTechFormats;
        errorMessage = 'Invalid lab technician license format. Should be like: DMLT-1234 or KA/LT/1234';
        break;
      default:
        return { valid: true, message: '' };
    }

    const isValid = formats.some(format => format.test(license));
    return {
      valid: isValid,
      message: isValid ? '' : errorMessage
    };
  },

  // Name validation
  validateName: (name) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Name is required' };
    }
    
    const nameRegex = /^[A-Za-z\s\.\-]+$/;
    if (!nameRegex.test(name)) {
      return { valid: false, message: 'Name can only contain letters, spaces, dots and hyphens' };
    }
    
    if (name.trim().length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters long' };
    }
    
    return { valid: true, message: '' };
  },

  // Alternate phone validation (optional)
  validateAlternatePhone: (phone) => {
    if (!phone) return { valid: true, message: '' };
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, message: 'Alternate phone must start with 6-9 and be exactly 10 digits' };
    }
    return { valid: true, message: '' };
  },

  // Emergency contact validation (optional)
  validateEmergencyContact: (phone) => {
    if (!phone) return { valid: true, message: '' };
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, message: 'Emergency contact must start with 6-9 and be exactly 10 digits' };
    }
    return { valid: true, message: '' };
  },

  // Validate all fields for staff
  validateStaffForm: (formData, qualifications = []) => {
    const errors = [];
    const newFieldErrors = {};

    // Name validation
    const nameValidation = this.validateName(formData.Name);
    if (!nameValidation.valid) {
        errors.push(nameValidation.message);
        newFieldErrors.Name = nameValidation.message;
    }

    // Email validation
    const emailValidation = this.validateEmail(formData.Email);
    if (!emailValidation.valid) {
        errors.push(emailValidation.message);
        newFieldErrors.Email = emailValidation.message;
    }

    // Phone validation
    const phoneValidation = this.validatePhone(formData.Phone_Number);
    if (!phoneValidation.valid) {
      errors.push(phoneValidation.message);
      newFieldErrors.Phone_Number = phoneValidation.message;
    }

    // Alternate phone
    if (formData.Alternate_Phone) {
      const altPhoneValidation = this.validateAlternatePhone(formData.Alternate_Phone);
      if (!altPhoneValidation.valid) {
        errors.push(altPhoneValidation.message);
        newFieldErrors.Alternate_Phone = altPhoneValidation.message;
      }
    }

    // Emergency contact
    if (formData.Emergency_Contact) {
      const emergencyValidation = this.validateEmergencyContact(formData.Emergency_Contact);
      if (!emergencyValidation.valid) {
        errors.push(emergencyValidation.message);
        newFieldErrors.Emergency_Contact = emergencyValidation.message;
      }
    }

    // DOB validation
    const dobValidation = this.validateDOB(formData.Date_of_Birth, formData.Role);
    if (!dobValidation.valid) {
      errors.push(dobValidation.message);
      newFieldErrors.Date_of_Birth = dobValidation.message;
    }

    // Pincode validation
    if (formData.Pincode) {
      const pincodeValidation = this.validatePincode(formData.Pincode);
      if (!pincodeValidation.valid) {
        errors.push(pincodeValidation.message);
        newFieldErrors.Pincode = pincodeValidation.message;
      }
    }

    // IFSC validation
    if (formData.IFSC_Code) {
      const ifscValidation = this.validateIFSC(formData.IFSC_Code);
      if (!ifscValidation.valid) {
        errors.push(ifscValidation.message);
        newFieldErrors.IFSC_Code = ifscValidation.message;
      }
    }

    // Account number validation
    if (formData.Account_Number) {
      const accountValidation = this.validateAccountNumber(formData.Account_Number);
      if (!accountValidation.valid) {
        errors.push(accountValidation.message);
        newFieldErrors.Account_Number = accountValidation.message;
      }
    }

    // Joining date validation
    const joiningDateValidation = this.validateJoiningDate(formData.Joining_Date);
    if (!joiningDateValidation.valid) {
      errors.push(joiningDateValidation.message);
      newFieldErrors.Joining_Date = joiningDateValidation.message;
    }

    // Experience validation
    const experienceValidation = this.validateExperience(formData.Experience, formData.Date_of_Birth, qualifications);
    if (!experienceValidation.valid) {
      errors.push(experienceValidation.message);
      newFieldErrors.Experience = experienceValidation.message;
    }

    // Consultation fees validation (for doctors)
    const feesValidation = this.validateConsultationFees(formData.Consultation_fees, formData.Role);
    if (!feesValidation.valid) {
      errors.push(feesValidation.message);
      newFieldErrors.Consultation_fees = feesValidation.message;
    }

    // Salary validation
    const salaryValidation = this.validateSalary(formData.Salary);
    if (!salaryValidation.valid) {
      errors.push(salaryValidation.message);
      newFieldErrors.Salary = salaryValidation.message;
    }

    // License number validation
    const licenseValidation = this.validateLicenseNumber(formData.License_Number, formData.Role);
    if (!licenseValidation.valid) {
      errors.push(licenseValidation.message);
      newFieldErrors.License_Number = licenseValidation.message;
    }

    // Role-specific validations
    if (formData.Role === 'Doctor') {
      if (!formData.Department) {
        errors.push('Doctors must be assigned to a department');
        newFieldErrors.Department = 'Doctors must be assigned to a department';
      }
      
      if (qualifications.length === 0 && (!formData.Qualification || formData.Qualification.trim() === '')) {
        errors.push('Doctors must have at least one qualification');
        newFieldErrors.Qualification = 'Doctors must have at least one qualification';
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      errorMessage: errors.join(', '),
      fieldErrors: newFieldErrors
    };
  }
};

export default validation;
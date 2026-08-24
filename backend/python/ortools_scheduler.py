"""
Google OR-Tools Schedule Optimizer
Uses Constraint Programming (CP-SAT) to generate optimal timetables
"""

import json
import sys
from ortools.sat.python import cp_model
from datetime import datetime, time

class TimetableOptimizer:
    def __init__(self, data):
        """Initialize the optimizer with input data"""
        self.model = cp_model.CpModel()
        self.data = data
        
        # Extract data
        self.subjects = data['subjects']
        self.faculty = data['faculty']
        self.rooms = data['rooms']
        self.days = data.get('days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
        self.time_slots = data.get('time_slots', self._generate_default_slots())
        self.sections = data.get('sections', 1)
        
        # Variables
        self.assignments = {}
        self.faculty_loads = {}
        
    def _generate_default_slots(self):
        """Generate default time slots for day shift"""
        return [
            {'start': '07:00', 'end': '08:00'},
            {'start': '08:00', 'end': '09:00'},
            {'start': '09:00', 'end': '10:00'},
            {'start': '10:00', 'end': '11:00'},
            {'start': '11:00', 'end': '12:00'},
            {'start': '12:00', 'end': '13:00'},  # Lunch (blocked)
            {'start': '13:00', 'end': '14:00'},
            {'start': '14:00', 'end': '15:00'},
            {'start': '15:00', 'end': '16:00'}
        ]
    
    def create_variables(self):
        """Create decision variables for schedule assignments"""
        # For each subject, section, day, time slot combination
        # Create a boolean variable indicating if it's scheduled
        
        for subj_idx, subject in enumerate(self.subjects):
            for section in range(self.sections):
                for day_idx, day in enumerate(self.days):
                    for slot_idx, slot in enumerate(self.time_slots):
                        # Skip lunch break (12:00-13:00)
                        if slot['start'] == '12:00' and slot['end'] == '13:00':
                            continue
                        
                        # Variable name: subject_section_day_slot
                        var_name = f's{subj_idx}_sec{section}_d{day_idx}_t{slot_idx}'
                        
                        # Create boolean variable
                        self.assignments[(subj_idx, section, day_idx, slot_idx)] = \
                            self.model.NewBoolVar(var_name)
        
        # Faculty assignment variables: which faculty teaches which subject
        for subj_idx, subject in enumerate(self.subjects):
            for section in range(self.sections):
                for fac_idx, faculty_member in enumerate(self.faculty):
                    var_name = f'faculty_s{subj_idx}_sec{section}_f{fac_idx}'
                    key = ('faculty', subj_idx, section, fac_idx)
                    self.assignments[key] = self.model.NewBoolVar(var_name)
        
        # Room assignment variables
        for subj_idx, subject in enumerate(self.subjects):
            for section in range(self.sections):
                for room_idx, room in enumerate(self.rooms):
                    var_name = f'room_s{subj_idx}_sec{section}_r{room_idx}'
                    key = ('room', subj_idx, section, room_idx)
                    self.assignments[key] = self.model.NewBoolVar(var_name)
    
    def add_constraints(self):
        """Add scheduling constraints"""
        
        # Constraint 1: Each subject-section must be scheduled for required hours
        for subj_idx, subject in enumerate(self.subjects):
            required_hours = subject.get('lecture_hours', 3) + subject.get('lab_hours', 0)
            
            for section in range(self.sections):
                # Sum of all time slots assigned to this subject-section
                assigned_slots = []
                for day_idx in range(len(self.days)):
                    for slot_idx in range(len(self.time_slots)):
                        if (subj_idx, section, day_idx, slot_idx) in self.assignments:
                            assigned_slots.append(
                                self.assignments[(subj_idx, section, day_idx, slot_idx)]
                            )
                
                # Must equal required hours
                self.model.Add(sum(assigned_slots) == required_hours)
        
        # Constraint 2: No room conflicts (one class per room at a time)
        for room_idx in range(len(self.rooms)):
            for day_idx in range(len(self.days)):
                for slot_idx in range(len(self.time_slots)):
                    # Skip lunch
                    slot = self.time_slots[slot_idx]
                    if slot['start'] == '12:00':
                        continue
                    
                    # Collect all subject-sections that could use this room at this time
                    room_users = []
                    for subj_idx in range(len(self.subjects)):
                        for section in range(self.sections):
                            time_var_key = (subj_idx, section, day_idx, slot_idx)
                            room_var_key = ('room', subj_idx, section, room_idx)
                            
                            if time_var_key in self.assignments and room_var_key in self.assignments:
                                # Create auxiliary variable for (time AND room assignment)
                                aux_var = self.model.NewBoolVar(
                                    f'room_conflict_r{room_idx}_s{subj_idx}_sec{section}_d{day_idx}_t{slot_idx}'
                                )
                                # aux_var = time_assigned AND room_assigned
                                self.model.AddBoolAnd([
                                    self.assignments[time_var_key],
                                    self.assignments[room_var_key]
                                ]).OnlyEnforceIf(aux_var)
                                
                                room_users.append(aux_var)
                    
                    # At most one class can use this room at this time
                    if room_users:
                        self.model.Add(sum(room_users) <= 1)
        
        # Constraint 3: No faculty conflicts (one class per faculty at a time)
        for fac_idx in range(len(self.faculty)):
            for day_idx in range(len(self.days)):
                for slot_idx in range(len(self.time_slots)):
                    # Skip lunch
                    slot = self.time_slots[slot_idx]
                    if slot['start'] == '12:00':
                        continue
                    
                    faculty_assignments = []
                    for subj_idx in range(len(self.subjects)):
                        for section in range(self.sections):
                            time_var_key = (subj_idx, section, day_idx, slot_idx)
                            faculty_var_key = ('faculty', subj_idx, section, fac_idx)
                            
                            if time_var_key in self.assignments and faculty_var_key in self.assignments:
                                # Create auxiliary variable
                                aux_var = self.model.NewBoolVar(
                                    f'faculty_conflict_f{fac_idx}_s{subj_idx}_sec{section}_d{day_idx}_t{slot_idx}'
                                )
                                self.model.AddBoolAnd([
                                    self.assignments[time_var_key],
                                    self.assignments[faculty_var_key]
                                ]).OnlyEnforceIf(aux_var)
                                
                                faculty_assignments.append(aux_var)
                    
                    # At most one class per faculty at this time
                    if faculty_assignments:
                        self.model.Add(sum(faculty_assignments) <= 1)
        
        # Constraint 4: Each subject-section must have exactly one faculty
        for subj_idx in range(len(self.subjects)):
            for section in range(self.sections):
                faculty_assignments = []
                for fac_idx in range(len(self.faculty)):
                    key = ('faculty', subj_idx, section, fac_idx)
                    if key in self.assignments:
                        faculty_assignments.append(self.assignments[key])
                
                if faculty_assignments:
                    self.model.Add(sum(faculty_assignments) == 1)
        
        # Constraint 5: Each subject-section must have exactly one room
        for subj_idx in range(len(self.subjects)):
            for section in range(self.sections):
                room_assignments = []
                for room_idx in range(len(self.rooms)):
                    key = ('room', subj_idx, section, room_idx)
                    if key in self.assignments:
                        room_assignments.append(self.assignments[key])
                
                if room_assignments:
                    self.model.Add(sum(room_assignments) == 1)
        
        # Constraint 6: Faculty qualifications (soft constraint via preferences)
        for subj_idx, subject in enumerate(self.subjects):
            required_quals = subject.get('required_qualifications', [])
            if required_quals:
                for section in range(self.sections):
                    for fac_idx, faculty_member in enumerate(self.faculty):
                        fac_specializations = faculty_member.get('specializations', [])
                        
                        # Check if faculty is qualified
                        is_qualified = any(
                            qual in fac_specializations 
                            for qual in required_quals
                        )
                        
                        # If not qualified, penalize this assignment (soft constraint)
                        if not is_qualified:
                            key = ('faculty', subj_idx, section, fac_idx)
                            if key in self.assignments:
                                # This will be handled in objective function
                                pass
        
        # Constraint 7: Faculty load limits
        for fac_idx, faculty_member in enumerate(self.faculty):
            max_load = faculty_member.get('max_teaching_load', 24)  # units
            
            # Sum of all units assigned to this faculty
            assigned_units = []
            for subj_idx, subject in enumerate(self.subjects):
                units = subject.get('units', 3)
                for section in range(self.sections):
                    key = ('faculty', subj_idx, section, fac_idx)
                    if key in self.assignments:
                        # Create scaled variable (units * boolean)
                        assigned_units.append(self.assignments[key] * units)
            
            if assigned_units:
                self.model.Add(sum(assigned_units) <= max_load)
        
        # Constraint 8: Consecutive time slots for multi-hour subjects
        # Prefer scheduling consecutive slots for same subject on same day
        for subj_idx, subject in enumerate(self.subjects):
            required_hours = subject.get('lecture_hours', 3) + subject.get('lab_hours', 0)
            
            if required_hours > 1:
                for section in range(self.sections):
                    for day_idx in range(len(self.days)):
                        # Encourage consecutive slots
                        for slot_idx in range(len(self.time_slots) - 1):
                            curr_slot = self.time_slots[slot_idx]
                            next_slot = self.time_slots[slot_idx + 1]
                            
                            # Skip lunch transitions
                            if curr_slot['start'] == '12:00' or next_slot['start'] == '12:00':
                                continue
                            
                            curr_key = (subj_idx, section, day_idx, slot_idx)
                            next_key = (subj_idx, section, day_idx, slot_idx + 1)
                            
                            if curr_key in self.assignments and next_key in self.assignments:
                                # This preference will be in objective
                                pass
    
    def set_objective(self):
        """Set optimization objective to maximize schedule quality"""
        objective_terms = []
        
        # Objective 1: Balance faculty workload (minimize variance)
        # Calculate total assignments per faculty
        for fac_idx in range(len(self.faculty)):
            assignments_count = []
            for subj_idx in range(len(self.subjects)):
                for section in range(self.sections):
                    key = ('faculty', subj_idx, section, fac_idx)
                    if key in self.assignments:
                        assignments_count.append(self.assignments[key])
            
            if assignments_count:
                # Minimize deviation from average
                # This is a simplification; real balance would use variance
                pass
        
        # Objective 2: Prefer qualified faculty
        qualification_bonus = 0
        for subj_idx, subject in enumerate(self.subjects):
            required_quals = subject.get('required_qualifications', [])
            if required_quals:
                for section in range(self.sections):
                    for fac_idx, faculty_member in enumerate(self.faculty):
                        fac_specializations = faculty_member.get('specializations', [])
                        
                        is_qualified = any(
                            qual in fac_specializations 
                            for qual in required_quals
                        )
                        
                        if is_qualified:
                            key = ('faculty', subj_idx, section, fac_idx)
                            if key in self.assignments:
                                objective_terms.append(self.assignments[key] * 10)  # Bonus
        
        # Objective 3: Prefer consecutive time slots
        consecutive_bonus = 0
        for subj_idx, subject in enumerate(self.subjects):
            for section in range(self.sections):
                for day_idx in range(len(self.days)):
                    for slot_idx in range(len(self.time_slots) - 1):
                        curr_slot = self.time_slots[slot_idx]
                        next_slot = self.time_slots[slot_idx + 1]
                        
                        if curr_slot['start'] == '12:00' or next_slot['start'] == '12:00':
                            continue
                        
                        curr_key = (subj_idx, section, day_idx, slot_idx)
                        next_key = (subj_idx, section, day_idx, slot_idx + 1)
                        
                        if curr_key in self.assignments and next_key in self.assignments:
                            # Bonus for consecutive scheduling
                            consec_var = self.model.NewBoolVar(
                                f'consecutive_s{subj_idx}_sec{section}_d{day_idx}_t{slot_idx}'
                            )
                            self.model.AddBoolAnd([
                                self.assignments[curr_key],
                                self.assignments[next_key]
                            ]).OnlyEnforceIf(consec_var)
                            
                            objective_terms.append(consec_var * 5)  # Bonus for consecutive
        
        # Set objective: maximize total score
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
    
    def solve(self, time_limit_seconds=30):
        """Solve the constraint satisfaction problem"""
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.log_search_progress = False
        
        status = solver.Solve(self.model)
        
        return status, solver
    
    def extract_solution(self, solver):
        """Extract the solution into a readable format"""
        if solver is None:
            return None
        
        schedules = []
        
        for subj_idx, subject in enumerate(self.subjects):
            for section in range(self.sections):
                section_name = chr(65 + section)  # A, B, C, ...
                
                # Find assigned faculty
                assigned_faculty = None
                for fac_idx, faculty_member in enumerate(self.faculty):
                    key = ('faculty', subj_idx, section, fac_idx)
                    if key in self.assignments and solver.Value(self.assignments[key]):
                        assigned_faculty = faculty_member
                        break
                
                # Find assigned room
                assigned_room = None
                for room_idx, room in enumerate(self.rooms):
                    key = ('room', subj_idx, section, room_idx)
                    if key in self.assignments and solver.Value(self.assignments[key]):
                        assigned_room = room
                        break
                
                # Find all assigned time slots
                time_slots = []
                for day_idx, day in enumerate(self.days):
                    for slot_idx, slot in enumerate(self.time_slots):
                        key = (subj_idx, section, day_idx, slot_idx)
                        if key in self.assignments and solver.Value(self.assignments[key]):
                            time_slots.append({
                                'day': day,
                                'start_time': slot['start'],
                                'end_time': slot['end']
                            })
                
                if time_slots:  # Only add if scheduled
                    schedule_entry = {
                        'subject': subject,
                        'section': section_name,
                        'faculty': assigned_faculty,
                        'room': assigned_room,
                        'time_slots': time_slots
                    }
                    schedules.append(schedule_entry)
        
        return schedules

def optimize_schedule(input_json):
    """Main function to optimize schedule"""
    try:
        # Parse input
        data = json.loads(input_json) if isinstance(input_json, str) else input_json
        
        # Create optimizer
        optimizer = TimetableOptimizer(data)
        
        # Create variables
        optimizer.create_variables()
        
        # Add constraints
        optimizer.add_constraints()
        
        # Set objective
        optimizer.set_objective()
        
        # Solve
        status, solver = optimizer.solve(time_limit_seconds=data.get('time_limit', 60))
        
        # Check status
        if status == cp_model.OPTIMAL:
            status_text = 'OPTIMAL'
        elif status == cp_model.FEASIBLE:
            status_text = 'FEASIBLE'
        elif status == cp_model.INFEASIBLE:
            status_text = 'INFEASIBLE'
        else:
            status_text = 'UNKNOWN'
        
        # Extract solution
        solution = optimizer.extract_solution(solver) if status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else None
        
        return {
            'success': status in [cp_model.OPTIMAL, cp_model.FEASIBLE],
            'status': status_text,
            'schedules': solution,
            'statistics': {
                'subjects_scheduled': len(solution) if solution else 0,
                'solver_time': solver.WallTime() if solver else 0
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'schedules': None
        }

if __name__ == '__main__':
    # Read from stdin
    input_data = sys.stdin.read()
    
    # Process
    result = optimize_schedule(input_data)
    
    # Output as JSON
    print(json.dumps(result))

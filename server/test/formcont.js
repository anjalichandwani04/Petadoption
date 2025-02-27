const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const formschema = require('../models/formschema');
const {
    submitForm,
    getForm,
    updateStatus,
    getFormMiddleware
} = require('../controllers/formController');

describe('Form Controller', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('submitForm', () => {
        it('should return an error if user email does not match registered email', async () => {
            const req = {
                body: {
                    name: 'John Doe',
                    email: 'johndoe@gmail.com',
                    address: '123 Main St',
                    firstpet: true,
                    whyadopt: 'Love pets',
                    petid: 'pet123'
                },
                user: { email: 'wrongemail@gmail.com' }
            };
            const res = {
                json: sinon.spy()
            };

            await submitForm(req, res);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'You can only apply using your registered email.'
            });
        });

        it('should return an error if form already exists', async () => {
            sinon.stub(formschema, 'findOne').resolves({});

            const req = {
                body: {
                    name: 'John Doe',
                    email: 'johndoe@gmail.com',
                    address: '123 Main St',
                    firstpet: true,
                    whyadopt: 'Love pets',
                    petid: 'pet123'
                },
                user: { email: 'johndoe@gmail.com' }
            };
            const res = {
                json: sinon.spy()
            };

            await submitForm(req, res);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'you have already applied for this pet'
            });
        });

        it('should return an error if required fields are missing', async () => {
            sinon.stub(formschema, 'findOne').resolves(null);

            const req = {
                body: {
                    email: 'johndoe@gmail.com', // Missing other fields
                    petid: 'pet123'
                },
                user: { email: 'johndoe@gmail.com' }
            };
            const res = {
                json: sinon.spy()
            };

            await submitForm(req, res);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'all fields required'
            });
        });

        it('should save and return success on valid input', async () => {
            const saveStub = sinon.stub(formschema.prototype, 'save').resolves({});
            sinon.stub(formschema, 'findOne').resolves(null);

            const req = {
                body: {
                    name: 'John Doe',
                    email: 'johndoe@gmail.com',
                    address: '123 Main St',
                    firstpet: true,
                    whyadopt: 'Love pets',
                    petid: 'pet123'
                },
                user: { email: 'johndoe@gmail.com' }
            };
            const res = {
                json: sinon.spy()
            };

            await submitForm(req, res);

            expect(saveStub.calledOnce).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: true,
                message: 'form submitted succesfully'
            });
        });

        it('should handle server errors gracefully', async () => {
            sinon.stub(formschema, 'findOne').throws(new Error('Server error'));

            const req = {
                body: {
                    name: 'John Doe',
                    email: 'johndoe@gmail.com',
                    address: '123 Main St',
                    firstpet: true,
                    whyadopt: 'Love pets',
                    petid: 'pet123'
                },
                user: { email: 'johndoe@gmail.com' }
            };
            const res = {
                json: sinon.spy()
            };

            await submitForm(req, res);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'error during form submition'
            });
        });
    });

    describe('getForm', () => {
        it('should retrieve forms with correct filters', async () => {
            sinon.stub(formschema, 'find').resolves([{ id: 'form123' }]);

            const req = { query: { petid: 'pet123' } };
            const res = {
                json: sinon.spy()
            };

            await getForm(req, res);

            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: true,
                message: 'Filtered forms retrieved'
            });
        });

        it('should handle errors during retrieval', async () => {
            sinon.stub(formschema, 'find').throws(new Error('Database error'));

            const req = { query: {} };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };

            await getForm(req, res);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'Database error'
            });
        });
    });

    describe('getFormMiddleware', () => {
        it('should call next with valid form', async () => {
            const form = { id: 'form123' };
            sinon.stub(formschema, 'findById').resolves(form);

            const req = { params: { id: 'form123' } };
            const res = {};
            const next = sinon.spy();

            await getFormMiddleware(req, res, next);

            expect(res.form).to.deep.equal(form);
            expect(next.calledOnce).to.be.true;
        });

        it('should return error if form not found', async () => {
            sinon.stub(formschema, 'findById').resolves(null);

            const req = { params: { id: 'form123' } };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const next = sinon.spy();

            await getFormMiddleware(req, res, next);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'cannot find form'
            });
            expect(next.notCalled).to.be.true;
        });
    });

    describe('updateStatus', () => {
        it('should update form status', async () => {
            const saveStub = sinon.stub().resolves({ status: 'approved' });
            const res = {
                form: { status: 'pending', save: saveStub },
                json: sinon.spy()
            };
            const req = { body: { status: 'approved' } };

            await updateStatus(req, res);

            expect(saveStub.calledOnce).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: true,
                message: 'Status updated'
            });
        });

        it('should return error if status is not provided', async () => {
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const req = { body: {} };

            await updateStatus(req, res);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'Status is required'
            });
        });

        it('should return error if form is not found', async () => {
            const res = {
                form: null,
                status: sinon.stub().returnsThis(),
                json: sinon.spy()
            };
            const req = { body: { status: 'approved' } };

            await updateStatus(req, res);

            expect(res.status.calledWith(404)).to.be.true;
            expect(res.json.args[0][0]).to.deep.include({
                success: false,
                message: 'No form found'
            });
        });
    });
});

import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table'


export class ListApplicationLogs extends Component {
    constructor(props){
        super(props);
    }

    render() {
        let applicationLogsList = this.props.availableApps.map( (applicationLog, index) => {
        return (<tr><td>{index+1}</td><td><a onClick={() => this.props.editApplicationLogHandler(applicationLog.Id)}>{applicationLog.Name}</a></td></tr>)
        })
        let applicationLogsListContent = (
            <div style={{color: 'black'}}>
                <Table striped bordered hover size="sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applicationLogsList}
                    </tbody>
                </Table>
            </div>
        );
        return (
            <Modal show={true} onHide={this.props.closeHandler}
				size="lg"
				aria-labelledby="contained-modal-title-vcenter"
				centered
			>
				<Modal.Header closeButton>
					<Modal.Title id="contained-modal-title-vcenter">
						<div style={{color: 'black'}}>List of ApplicationLogs</div>
          			</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{applicationLogsListContent}
				</Modal.Body>

				<Modal.Footer>
					<div style={{ display: 'flex' }}>
						<Button variant="danger" size="sm" style={{ marginRight: '10px' }} onClick={this.props.closeHandler}>Close</Button>
						<Button variant="success" size="sm" onClick={this.props.addNewAppLogHandler}>Add New</Button>
					</div>
				</Modal.Footer>

			</Modal>
        );
    }
}

const mapStateToProps = state => {
	return {
		availableApps: state.application.availableApps,
	};
};

const mapDispatchToProps = dispatch => {
    return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(ListApplicationLogs);
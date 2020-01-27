import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table'


export class ListLogSets extends Component {
    constructor(props){
        super(props);
    }

    render() {
        let logSetList = this.props.availableLogSets.map( (logSet, index) => {
        return (<tr><td>{index+1}</td><td><a onClick={() => this.props.editLogSetHandler(logSet.Id)}>{logSet.Name}</a></td></tr>)
        })
        let logSetListContent = (
            <div style={{color: 'black'}}>
                <Table striped bordered hover size="sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logSetList}
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
						<div style={{color: 'black'}}>List of LogSets</div>
          			</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{logSetListContent}
				</Modal.Body>

				<Modal.Footer>
					<div style={{ display: 'flex' }}>
						<Button variant="danger" size="sm" style={{ marginRight: '10px' }} onClick={this.props.closeHandler}>Close</Button>
						<Button variant="success" size="sm" onClick={this.props.addNewLogSetHandler}>Add New</Button>
					</div>
				</Modal.Footer>

			</Modal>
        );
    }
}

const mapStateToProps = state => {
	return {
		availableLogSets: state.application.availableLogSets,
	};
};

const mapDispatchToProps = dispatch => {
    return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(ListLogSets);